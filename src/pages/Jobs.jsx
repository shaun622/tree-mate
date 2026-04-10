import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select, TextArea } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import ClientPicker from '../components/pickers/ClientPicker'
import JobSitePicker from '../components/pickers/JobSitePicker'
import JobTypePicker from '../components/pickers/JobTypePicker'
import { statusLabel, formatDate } from '../lib/utils'

const STATUS_FILTERS = ['all', 'scheduled', 'in_progress', 'on_hold', 'completed']

export default function Jobs() {
  const { business } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const { jobSites, createJobSite, updateJobSite, getJobSitesByClient } = useJobSites(business?.id)
  const { staff } = useStaff(business?.id)
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', job_site_id: '', job_type: '', scheduled_date: '',
    scheduled_time: '09:00', duration_minutes: 60,
    staff_id: '', notes: '', status: 'scheduled'
  })
  const [jobTypes, setJobTypes] = useState([])

  useEffect(() => {
    if (!business?.id) return
    const fetchJobs = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('business_id', business.id).order('scheduled_date', { ascending: false })
      setJobs(data || [])
      setLoading(false)
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

  const badgeVariant = (status) => {
    const map = { scheduled: 'info', in_progress: 'primary', on_hold: 'warning', completed: 'success' }
    return map[status] || 'neutral'
  }

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
      scheduled_date: form.scheduled_date || null,
      scheduled_start,
      scheduled_end,
      duration_minutes: Number(form.duration_minutes) || 60,
      staff_id: form.staff_id || null,
      notes: form.notes || null,
      status: form.status,
    }).select().single()
    if (!error) {
      setJobs(prev => [data, ...prev])
      setShowModal(false)
      setForm({ client_id: '', job_site_id: '', job_type: '', scheduled_date: '', scheduled_time: '09:00', duration_minutes: 60, staff_id: '', notes: '', status: 'scheduled' })
    }
    setSaving(false)
  }

  return (
    <PageWrapper>
      <Header title="Jobs" rightAction={
        <button onClick={() => setShowModal(true)} className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${filter === s ? 'bg-gradient-brand text-white shadow-button' : 'bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'}`}>
              {s === 'all' ? 'All' : statusLabel(s)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="No jobs" description="Create your first job to get started"
            actionLabel="Create Job" onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(job => {
              const jc = clientMap[job.client_id]
              const js = siteMap[job.job_site_id]
              const timeStr = job.scheduled_start
                ? new Date(job.scheduled_start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
                : null
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full text-left bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100 hover:border-tree-200 hover:shadow-elevated transition-all duration-150 active:scale-[0.995]"
                >
                  <div className="flex">
                    {/* Thumbnail strip */}
                    <div className="w-16 bg-gradient-to-br from-tree-500 to-tree-700 flex flex-col items-center justify-center text-white flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {job.scheduled_date && (
                        <p className="text-[10px] font-bold mt-1 leading-tight text-center px-1">
                          {new Date(job.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-bold text-gray-900 truncate">{job.job_type || 'Job'}</p>
                        <Badge variant={badgeVariant(job.status)}>{statusLabel(job.status)}</Badge>
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
                      {(timeStr || job.duration_minutes) && (
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                          {timeStr && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
                              {timeStr}
                            </span>
                          )}
                          {job.duration_minutes && <span>· {job.duration_minutes}m</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Job" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
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
          <div className="flex gap-2">
            <Input label="Date *" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} className="flex-1" required />
            <Input label="Time" type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} className="flex-1" />
          </div>
          <Input label="Duration (min)" type="number" min="15" step="15" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
          {staff.length > 0 && (
            <Select label="Assign Staff" value={form.staff_id} onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))} options={[{ value: '', label: 'Unassigned' }, ...staff.map(s => ({ value: s.id, label: s.name }))]} />
          )}
          <TextArea label="Notes" placeholder="Job notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">Create Job</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
