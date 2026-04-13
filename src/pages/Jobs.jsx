import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select, TextArea } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import ClientPicker from '../components/pickers/ClientPicker'
import JobSitePicker from '../components/pickers/JobSitePicker'
import JobTypePicker from '../components/pickers/JobTypePicker'
import { statusLabel, statusColor, formatCurrency, JOB_STATUSES, JOB_PRIORITIES, ESTIMATED_DURATIONS, PRIORITY_STYLES } from '../lib/utils'

const PIPELINE_COLUMNS = ['enquiry', 'site_visit', 'quoted', 'approved', 'scheduled', 'in_progress', 'completed']
const LIST_FILTERS = ['all', ...PIPELINE_COLUMNS, 'invoiced', 'paid']

const INITIAL_STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'site_visit', label: 'Site Visit Booked' },
  { value: 'quoted', label: 'Ready to Quote' },
  { value: 'scheduled', label: 'Scheduled' },
]

export default function Jobs() {
  const { business } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const { jobSites, createJobSite, updateJobSite, getJobSitesByClient } = useJobSites(business?.id)
  const { staff } = useStaff(business?.id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [quotes, setQuotes] = useState({}) // quote_id -> quote
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(searchParams.get('status') || 'all')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'pipeline'
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', job_site_id: '', job_type: '', scheduled_date: '',
    scheduled_time: '09:00', duration_minutes: 60,
    staff_id: '', notes: '', status: 'enquiry',
    priority: 'normal', site_visit_date: '', site_visit_time: '09:00',
  })
  const [jobTypes, setJobTypes] = useState([])

  useEffect(() => {
    if (!business?.id) return
    const fetchJobs = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      const jobList = data || []
      setJobs(jobList)
      setLoading(false)

      // Fetch linked quotes for value display
      const quoteIds = [...new Set(jobList.filter(j => j.quote_id).map(j => j.quote_id))]
      if (quoteIds.length) {
        const { data: quotesData } = await supabase.from('quotes').select('id,total,status').in('id', quoteIds)
        setQuotes(Object.fromEntries((quotesData || []).map(q => [q.id, q])))
      }
    }
    const fetchJobTypes = async () => {
      const { data } = await supabase.from('job_type_templates').select('*').eq('business_id', business.id)
      setJobTypes(data || [])
    }
    fetchJobs()
    fetchJobTypes()
  }, [business?.id])

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const siteMap = Object.fromEntries(jobSites.map(s => [s.id, s]))
  const clientSites = form.client_id ? getJobSitesByClient(form.client_id) : []

  const createJobTypeTemplate = async (name) => {
    const { data, error } = await supabase
      .from('job_type_templates')
      .insert({ business_id: business.id, name })
      .select()
      .single()
    if (!error && data) setJobTypes(prev => [...prev, data])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    let scheduled_start = null
    let scheduled_end = null
    if (form.scheduled_date && form.scheduled_time) {
      const startDt = new Date(`${form.scheduled_date}T${form.scheduled_time}`)
      scheduled_start = startDt.toISOString()
      scheduled_end = new Date(startDt.getTime() + (Number(form.duration_minutes) || 60) * 60000).toISOString()
    }
    const { data, error } = await supabase.from('jobs').insert({
      business_id: business.id,
      client_id: form.client_id || null,
      job_site_id: form.job_site_id || null,
      job_type: form.job_type || null,
      scheduled_date: form.status === 'scheduled' ? (form.scheduled_date || null) : null,
      scheduled_start: form.status === 'scheduled' ? scheduled_start : null,
      scheduled_end: form.status === 'scheduled' ? scheduled_end : null,
      duration_minutes: Number(form.duration_minutes) || 60,
      staff_id: form.staff_id || null,
      notes: form.notes || null,
      status: form.status,
      priority: form.priority,
      site_visit_date: form.status === 'site_visit' ? (form.site_visit_date || null) : null,
      site_visit_time: form.status === 'site_visit' ? (form.site_visit_time || null) : null,
    }).select().single()
    if (!error) {
      setJobs(prev => [data, ...prev])
      setShowModal(false)
      setForm({ client_id: '', job_site_id: '', job_type: '', scheduled_date: '', scheduled_time: '09:00', duration_minutes: 60, staff_id: '', notes: '', status: 'enquiry', priority: 'normal', site_visit_date: '', site_visit_time: '09:00' })
    }
    setSaving(false)
  }

  // Extract suburb from full address
  const getSuburb = (address) => {
    if (!address) return ''
    const parts = address.split(',').map(p => p.trim())
    return parts.length >= 2 ? parts[parts.length - 3] || parts[0] : parts[0]
  }

  // ── Job Card (shared between list and pipeline) ────────────────────────────
  const JobCard = ({ job, compact = false }) => {
    const jc = clientMap[job.client_id]
    const js = siteMap[job.job_site_id]
    const quote = quotes[job.quote_id]
    const staffMember = staff.find(s => s.id === job.staff_id)
    const showPriority = job.priority && job.priority !== 'normal'
    const pStyle = PRIORITY_STYLES[job.priority] || {}

    return (
      <button
        type="button"
        onClick={() => navigate(`/jobs/${job.id}`)}
        className={`w-full text-left bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100 hover:border-tree-200 hover:shadow-elevated transition-all duration-150 active:scale-[0.995] ${compact ? '' : ''}`}
      >
        {compact ? (
          /* Pipeline compact card */
          <div className="p-3">
            <div className="flex items-start justify-between gap-1.5 mb-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{job.job_type || 'Job'}</p>
              {showPriority && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pStyle.bg} ${pStyle.text}`}>
                  {job.priority === 'emergency' ? '!!!' : '!!'}
                </span>
              )}
            </div>
            {jc && <p className="text-xs text-gray-600 truncate">{jc.name}</p>}
            {js?.address && <p className="text-[11px] text-gray-400 truncate">{getSuburb(js.address)}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {quote?.total > 0 && (
                <span className="text-[11px] font-bold text-tree-600">{formatCurrency(quote.total)}</span>
              )}
              {job.scheduled_date && (
                <span className="text-[10px] text-gray-400">
                  {new Date(job.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {staffMember && (
                <span className="text-[10px] text-gray-400 truncate">{staffMember.name}</span>
              )}
            </div>
          </div>
        ) : (
          /* List full card */
          <div className="flex">
            <div className="w-16 bg-gradient-to-br from-tree-500 to-tree-700 flex flex-col items-center justify-center text-white flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {job.scheduled_date && (
                <p className="text-[10px] font-bold mt-1 leading-tight text-center px-1">
                  {new Date(job.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{job.job_type || 'Job'}</p>
                  {showPriority && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${pStyle.bg} ${pStyle.text}`}>
                      {statusLabel(job.priority)}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${statusColor(job.status)}`}>
                  {statusLabel(job.status)}
                </span>
              </div>
              {jc && (
                <p className="text-sm text-gray-700 truncate flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {jc.name}
                </p>
              )}
              {js?.address && (
                <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {js.address}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 flex-wrap">
                {quote?.total > 0 && (
                  <span className="font-bold text-tree-600">{formatCurrency(quote.total)}</span>
                )}
                {job.scheduled_start && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
                    {new Date(job.scheduled_start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                )}
                {job.duration_minutes && <span>· {job.duration_minutes}m</span>}
                {staffMember && <span>· {staffMember.name}</span>}
              </div>
            </div>
          </div>
        )}
      </button>
    )
  }

  // ── Pipeline Kanban View ──────────────────────────────────────────────────
  const PipelineView = () => {
    const columnJobs = PIPELINE_COLUMNS.reduce((acc, col) => {
      acc[col] = jobs.filter(j => j.status === col)
      return acc
    }, {})

    return (
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: `${PIPELINE_COLUMNS.length * 220}px` }}>
          {PIPELINE_COLUMNS.map(col => (
            <div key={col} className="w-[200px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${statusColor(col)} px-2 py-1 rounded-lg`}>
                  {statusLabel(col)}
                </span>
                <span className="text-xs text-gray-400 font-semibold">{columnJobs[col].length}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {columnJobs[col].length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
                    <p className="text-xs text-gray-300">No jobs</p>
                  </div>
                ) : (
                  columnJobs[col].map(job => <JobCard key={job.id} job={job} compact />)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <PageWrapper>
      <Header title="Jobs" rightAction={
        <div className="flex items-center gap-1">
          {/* View toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'pipeline' : 'list')}
            className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200"
            title={viewMode === 'list' ? 'Pipeline view' : 'List view'}
          >
            {viewMode === 'list' ? (
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            )}
          </button>
          {/* Add button */}
          <button onClick={() => setShowModal(true)} className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95">
            <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      } />

      <div className="px-4 py-4 space-y-4">
        {viewMode === 'list' && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {LIST_FILTERS.map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${filter === s ? 'bg-gradient-brand text-white shadow-button' : 'bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'}`}>
                {s === 'all' ? `All (${jobs.length})` : `${statusLabel(s)} (${jobs.filter(j => j.status === s).length})`}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="No jobs" description="Create your first job to get started"
            actionLabel="Create Job" onAction={() => setShowModal(true)}
          />
        ) : viewMode === 'pipeline' ? (
          <PipelineView />
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No jobs with status "{statusLabel(filter)}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Job" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Initial Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start As</label>
            <div className="grid grid-cols-2 gap-2">
              {INITIAL_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.status === opt.value
                      ? 'border-tree-500 bg-tree-50 text-tree-700'
                      : 'border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {JOB_PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.priority === p
                      ? p === 'emergency' ? 'border-red-400 bg-red-50 text-red-700'
                        : p === 'urgent' ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-tree-500 bg-tree-50 text-tree-700'
                      : 'border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {statusLabel(p)}
                </button>
              ))}
            </div>
          </div>

          <ClientPicker
            clients={clients}
            value={form.client_id}
            onChange={(id) => setForm(p => ({ ...p, client_id: id, job_site_id: '' }))}
            onCreate={createClient}
            onUpdate={updateClient}
            required
          />
          <JobSitePicker
            sites={clientSites}
            client={clients.find(c => c.id === form.client_id)}
            clientId={form.client_id}
            value={form.job_site_id}
            onChange={(id) => setForm(p => ({ ...p, job_site_id: id }))}
            onCreate={createJobSite}
            onUpdate={updateJobSite}
          />
          <JobTypePicker
            templates={jobTypes}
            value={form.job_type}
            onChange={(v) => setForm(p => ({ ...p, job_type: v }))}
            onCreateTemplate={createJobTypeTemplate}
          />

          {/* Site Visit date/time (when status = site_visit) */}
          {form.status === 'site_visit' && (
            <div className="flex gap-2">
              <Input label="Site Visit Date *" type="date" value={form.site_visit_date} onChange={e => setForm(p => ({ ...p, site_visit_date: e.target.value }))} className="flex-1" required />
              <Input label="Time" type="time" value={form.site_visit_time} onChange={e => setForm(p => ({ ...p, site_visit_time: e.target.value }))} className="flex-1" />
            </div>
          )}

          {/* Scheduled date/time (when status = scheduled) */}
          {form.status === 'scheduled' && (
            <>
              <div className="flex gap-2">
                <Input label="Scheduled Date *" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} className="flex-1" required />
                <Input label="Time" type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} className="flex-1" />
              </div>
              <Input label="Duration (min)" type="number" min="15" step="15" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
              {staff.length > 0 && (
                <Select label="Assign Crew" value={form.staff_id} onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))} options={[{ value: '', label: 'Unassigned' }, ...staff.map(s => ({ value: s.id, label: s.name }))]} />
              )}
            </>
          )}

          <TextArea label="Notes" placeholder="Job notes, access instructions..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">Create Job</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
