import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, TextArea } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import ClientPicker from '../components/pickers/ClientPicker'
import JobSitePicker from '../components/pickers/JobSitePicker'
import JobTypePicker from '../components/pickers/JobTypePicker'
import JobDetailView from '../components/jobs/JobDetailView'
import { statusLabel, statusColor, formatCurrency, PRIORITY_STYLES } from '../lib/utils'

// 4-stage pipeline: Quoted → Scheduled → Invoice → Completed
const LIST_FILTERS = [
  { key: 'quoted', label: 'Quoted', statuses: ['enquiry', 'site_visit', 'quoted', 'approved'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled', 'in_progress'] },
  { key: 'invoice', label: 'Invoice', statuses: ['completed', 'invoiced'] },
  { key: 'completed', label: 'Completed', statuses: ['paid'] },
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
  const [filter, setFilter] = useState(() => {
    const param = searchParams.get('status')
    if (!param) return 'quoted'
    // Map DB statuses to simplified filter keys
    const filterForStatus = LIST_FILTERS.find(f => f.statuses?.includes(param))
    return filterForStatus ? filterForStatus.key : 'quoted'
  })
  const [viewMode, setViewMode] = useState('list') // 'list' | 'pipeline'
  const [showModal, setShowModal] = useState(!!searchParams.get('new'))
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: searchParams.get('client_id') || '', job_site_id: '', job_type: '',
    scheduled_date: '', scheduled_time: '09:00', notes: '',
  })
  const [jobTypes, setJobTypes] = useState([])
  const [previewJob, setPreviewJob] = useState(null) // job detail modal
  const [previewData, setPreviewData] = useState({ client: null, site: null, quote: null, reports: [] })
  const [previewUpdating, setPreviewUpdating] = useState(false)

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

  const activeFilter = LIST_FILTERS.find(f => f.key === filter) || LIST_FILTERS[0]
  const filtered = jobs.filter(j => activeFilter.statuses.includes(j.status))
  const isCompletedView = filter === 'completed'

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

  // ── Job Preview Modal ──────────────────────────────────────────────────────
  const openPreview = async (job) => {
    setPreviewJob(job)
    const [c, s, q, r] = await Promise.all([
      job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).single() : { data: null },
      job.job_site_id ? supabase.from('job_sites').select('*').eq('id', job.job_site_id).single() : { data: null },
      job.quote_id ? supabase.from('quotes').select('*').eq('id', job.quote_id).single() : { data: null },
      supabase.from('job_reports').select('*').eq('job_id', job.id).order('created_at', { ascending: false }),
    ])
    setPreviewData({ client: c.data, site: s.data, quote: q.data, reports: r.data || [] })
  }

  const closePreview = () => {
    setPreviewJob(null)
    setPreviewData({ client: null, site: null, quote: null, reports: [] })
  }

  const previewStatusChange = async (status) => {
    if (!previewJob) return
    setPreviewUpdating(true)
    const updates = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'paid') updates.completed_at = updates.completed_at || new Date().toISOString()
    const { data } = await supabase.from('jobs').update(updates).eq('id', previewJob.id).select().single()
    if (data) {
      setPreviewJob(data)
      setJobs(prev => prev.map(j => j.id === data.id ? data : j))
    }
    setPreviewUpdating(false)
  }

  const previewAcceptQuote = async () => {
    if (!previewData.quote?.id || !previewJob) return
    setPreviewUpdating(true)
    const { data: updatedQuote } = await supabase.from('quotes').update({ status: 'accepted' }).eq('id', previewData.quote.id).select().single()
    if (updatedQuote) setPreviewData(prev => ({ ...prev, quote: updatedQuote }))
    const { data: updatedJob } = await supabase.from('jobs').update({ status: 'approved' }).eq('id', previewJob.id).select().single()
    if (updatedJob) {
      setPreviewJob(updatedJob)
      setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    }
    setPreviewUpdating(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const hasDate = !!form.scheduled_date
    let scheduled_start = null
    let scheduled_end = null
    if (hasDate && form.scheduled_time) {
      const startDt = new Date(`${form.scheduled_date}T${form.scheduled_time}`)
      scheduled_start = startDt.toISOString()
      scheduled_end = new Date(startDt.getTime() + 60 * 60000).toISOString()
    }
    const { data, error } = await supabase.from('jobs').insert({
      business_id: business.id,
      client_id: form.client_id || null,
      job_site_id: form.job_site_id || null,
      job_type: form.job_type || null,
      scheduled_date: hasDate ? form.scheduled_date : null,
      scheduled_start: hasDate ? scheduled_start : null,
      scheduled_end: hasDate ? scheduled_end : null,
      notes: form.notes || null,
      status: hasDate ? 'scheduled' : 'enquiry',
      priority: 'normal',
    }).select().single()
    if (!error) {
      setJobs(prev => [data, ...prev])
      setShowModal(false)
      setForm({ client_id: '', job_site_id: '', job_type: '', scheduled_date: '', scheduled_time: '09:00', notes: '' })
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
  const JobCard = ({ job, compact = false, done = false, invoiceView = false, quotedView = false }) => {
    const jc = clientMap[job.client_id]
    const js = siteMap[job.job_site_id]
    const quote = quotes[job.quote_id]
    const staffMember = staff.find(s => s.id === job.staff_id)
    const showPriority = job.priority && job.priority !== 'normal'
    const pStyle = PRIORITY_STYLES[job.priority] || {}

    const handleClick = () => {
      openPreview(job)
    }

    const handleQuickEdit = (e) => {
      e.stopPropagation()
      openPreview(job)
    }

    const handleQuickAccept = async (e) => {
      e.stopPropagation()
      if (!job.quote_id) return
      const { data: updatedQuote } = await supabase.from('quotes').update({ status: 'accepted' }).eq('id', job.quote_id).select().single()
      if (updatedQuote) setQuotes(prev => ({ ...prev, [updatedQuote.id]: updatedQuote }))
      const { data: updatedJob } = await supabase.from('jobs').update({ status: 'approved' }).eq('id', job.id).select().single()
      if (updatedJob) setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    }

    return (
      <div className={`w-full text-left bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100/80 hover:border-tree-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ${done ? 'opacity-60' : ''}`}>
        <button
          type="button"
          onClick={handleClick}
          className="w-full text-left active:scale-[0.995] transition-all duration-200"
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
            <div className={`w-16 ${done ? 'bg-gray-300' : 'bg-gradient-to-br from-tree-500 to-tree-700'} flex flex-col items-center justify-center text-white flex-shrink-0`}>
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
                  <p className={`font-bold truncate ${done ? 'text-gray-400' : 'text-gray-900'}`}>{job.job_type || 'Job'}</p>
                  {showPriority && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${pStyle.bg} ${pStyle.text}`}>
                      {statusLabel(job.priority)}
                    </span>
                  )}
                </div>
                {invoiceView ? (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${job.status === 'invoiced' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {job.status === 'invoiced' ? 'Invoice Sent' : 'Not Sent'}
                  </span>
                ) : quotedView ? (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${job.status === 'approved' ? 'bg-green-100 text-green-700' : job.status === 'quoted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {job.status === 'approved' ? 'Quote Accepted' : job.status === 'quoted' ? 'Quote Sent' : statusLabel(job.status)}
                  </span>
                ) : (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${statusColor(job.status)}`}>
                    {statusLabel(job.status)}
                  </span>
                )}
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
        {/* Quick actions for Quoted view */}
        {quotedView && !compact && (
          <div className="flex border-t border-gray-100">
            {job.status === 'approved' ? (
              <>
                <button
                  onClick={handleQuickEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Job
                </button>
                <div className="w-px bg-gray-100" />
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-tree-600 hover:text-white hover:bg-tree-600 transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Schedule
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleQuickEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {job.quote_id ? 'Edit Quote' : 'Create Quote'}
                </button>
                {job.quote_id && (
                  <>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={handleQuickAccept}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-tree-600 hover:text-white hover:bg-tree-600 transition-all duration-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Accept
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Pipeline Kanban View ──────────────────────────────────────────────────
  const PipelineView = () => {
    const columns = LIST_FILTERS
    return (
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: `${columns.length * 240}px` }}>
          {columns.map(col => {
            const colJobs = jobs.filter(j => col.statuses.includes(j.status))
            return (
              <div key={col.key} className="w-[220px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-tree-100 text-tree-700 px-2 py-1 rounded-lg">
                    {col.label}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold">{colJobs.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colJobs.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl h-20 flex items-center justify-center">
                      <p className="text-xs text-gray-300">No jobs</p>
                    </div>
                  ) : (
                    colJobs.map(job => <JobCard key={job.id} job={job} compact />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <PageWrapper width="wide">
      <Header title="Jobs" subtitle="Track every job from enquiry to completion" rightAction={
        <div className="flex items-center gap-2">
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
          <button onClick={() => navigate('/quotes/new')} className="px-3 py-1.5 text-xs font-semibold text-tree-600 border-2 border-tree-200 rounded-xl hover:bg-tree-50 transition-all duration-200 active:scale-95">
            Quick Quote
          </button>
          <button onClick={() => setShowModal(true)} className="px-3 py-1.5 text-xs font-semibold text-white bg-tree-600 rounded-xl hover:bg-tree-700 shadow-button transition-all duration-200 active:scale-95 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Job
          </button>
        </div>
      } />

      <div className="px-4 py-4 space-y-4">
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2">
            {LIST_FILTERS.map(f => {
              const count = jobs.filter(j => f.statuses.includes(j.status)).length
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${filter === f.key ? 'bg-tree-600 text-white shadow-button' : 'bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'}`}>
                  {f.label} ({count})
                </button>
              )
            })}
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
            <p className="text-sm text-gray-400">No {activeFilter.label.toLowerCase()} jobs</p>
          </div>
        ) : (
          <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
            {filtered.map(job => <JobCard key={job.id} job={job} done={isCompletedView} invoiceView={filter === 'invoice'} quotedView={filter === 'quoted'} />)}
          </div>
        )}
      </div>

      {/* Job Preview Modal (Quoted tab) */}
      <Modal open={!!previewJob} onClose={closePreview} title={previewJob?.job_type || 'Job'} size="lg">
        {previewJob && (
          <JobDetailView
            job={previewJob}
            client={previewData.client}
            site={previewData.site}
            quote={previewData.quote}
            staff={staff}
            reports={previewData.reports}
            updating={previewUpdating}
            compact
            onStatusChange={previewStatusChange}
            onEditQuote={previewData.quote ? () => { closePreview(); navigate(`/quotes/${previewData.quote.id}`) } : null}
            onAcceptQuote={previewData.quote ? previewAcceptQuote : null}
            onCreateQuote={() => { closePreview(); navigate(`/quotes/new?job_id=${previewJob.id}`) }}
            onCreateInvoice={() => { closePreview(); navigate(`/invoices/new?job_id=${previewJob.id}`) }}
            onEdit={() => { closePreview(); navigate(`/jobs/${previewJob.id}`) }}
          />
        )}
      </Modal>

      {/* Create Job Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Job">
        <form onSubmit={handleCreate} className="space-y-4">
          <ClientPicker
            clients={clients}
            value={form.client_id}
            onChange={(id) => setForm(p => ({ ...p, client_id: id, job_site_id: '' }))}
            onCreate={createClient}
            onUpdate={updateClient}
            required
          />
          {form.client_id && (
            <JobSitePicker
              sites={clientSites}
              client={clients.find(c => c.id === form.client_id)}
              clientId={form.client_id}
              value={form.job_site_id}
              onChange={(id) => setForm(p => ({ ...p, job_site_id: id }))}
              onCreate={createJobSite}
              onUpdate={updateJobSite}
            />
          )}
          <JobTypePicker
            templates={jobTypes}
            value={form.job_type}
            onChange={(v) => setForm(p => ({ ...p, job_type: v }))}
            onCreateTemplate={createJobTypeTemplate}
          />
          <div className="flex gap-2">
            <Input label="Date" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} className="flex-1" />
            <Input label="Time" type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} className="flex-1" />
          </div>
          {!form.scheduled_date && (
            <p className="text-xs text-gray-400 -mt-2">Leave blank to start as an enquiry</p>
          )}
          <TextArea label="Notes" placeholder="Job notes, access instructions..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">Create Job</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
