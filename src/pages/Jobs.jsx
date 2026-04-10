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
import { statusLabel, statusColor, formatDate, SUGGESTED_JOB_TYPES } from '../lib/utils'

const STATUS_FILTERS = ['all', 'scheduled', 'in_progress', 'on_hold', 'completed']

export default function Jobs() {
  const { business } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const { jobSites, createJobSite, getJobSitesByClient } = useJobSites(business?.id)
  const { staff } = useStaff(business?.id)
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', job_site_id: '', job_type: '', scheduled_date: '',
    scheduled_time: '', duration_minutes: 60,
    staff_id: '', notes: '', status: 'scheduled'
  })
  const [jobTypes, setJobTypes] = useState([])
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', phone: '' })
  const [savingClient, setSavingClient] = useState(false)
  const [editingClient, setEditingClient] = useState(false)
  const [editClientForm, setEditClientForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [showNewSite, setShowNewSite] = useState(false)
  const [newSiteForm, setNewSiteForm] = useState({ address: '', notes: '' })
  const [savingSite, setSavingSite] = useState(false)

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

  const allJobTypes = [
    ...jobTypes.map(t => ({ value: t.name, label: t.name })),
    ...SUGGESTED_JOB_TYPES.filter(s => !jobTypes.find(t => t.name === s.name)).map(s => ({ value: s.name, label: s.name }))
  ]

  const badgeVariant = (status) => {
    const map = { scheduled: 'info', in_progress: 'primary', on_hold: 'warning', completed: 'success' }
    return map[status] || 'neutral'
  }

  const handleClientSelect = (value) => {
    if (value === '__new__') {
      setShowNewClient(true)
      setForm(p => ({ ...p, client_id: '', job_site_id: '' }))
    } else {
      setShowNewClient(false)
      setForm(p => ({ ...p, client_id: value, job_site_id: '' }))
    }
  }

  const handleJobSiteSelect = (value) => {
    if (value === '__new__') {
      setShowNewSite(true)
      setForm(p => ({ ...p, job_site_id: '' }))
    } else {
      setShowNewSite(false)
      setForm(p => ({ ...p, job_site_id: value }))
    }
  }

  const handleCreateSite = async () => {
    if (!newSiteForm.address.trim() || !form.client_id) return
    setSavingSite(true)
    const { data, error } = await createJobSite({ ...newSiteForm, client_id: form.client_id })
    if (!error && data) {
      setForm(p => ({ ...p, job_site_id: data.id }))
      setShowNewSite(false)
      setNewSiteForm({ address: '', notes: '' })
    }
    setSavingSite(false)
  }

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim()) return
    setSavingClient(true)
    const { data, error } = await createClient(newClientForm)
    if (!error && data) {
      setForm(p => ({ ...p, client_id: data.id }))
      setShowNewClient(false)
      setNewClientForm({ name: '', email: '', phone: '' })
    }
    setSavingClient(false)
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
      setForm({ client_id: '', job_site_id: '', job_type: '', scheduled_date: '', scheduled_time: '', duration_minutes: 60, staff_id: '', notes: '', status: 'scheduled' })
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
          <div className="space-y-2">
            {filtered.map(job => (
              <Card key={job.id} hover onClick={() => navigate(`/jobs/${job.id}`)} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{job.job_type || 'Job'}</p>
                  <Badge variant={badgeVariant(job.status)}>{statusLabel(job.status)}</Badge>
                </div>
                <p className="text-sm text-gray-500">{clientMap[job.client_id]?.name || ''}</p>
                <p className="text-sm text-gray-400">{siteMap[job.job_site_id]?.address || ''}</p>
                {job.scheduled_date && <p className="text-xs text-gray-400 mt-1">{formatDate(job.scheduled_date)}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Job" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Client" value={form.client_id} onChange={e => handleClientSelect(e.target.value)} options={[{ value: '', label: 'Select client...' }, { value: '__new__', label: '+ New Client' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} required />
          {showNewClient && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Add Client</p>
              <Input placeholder="Client name" value={newClientForm.name} onChange={e => setNewClientForm(p => ({ ...p, name: e.target.value }))} />
              <div className="flex gap-2">
                <Input placeholder="Email" type="email" value={newClientForm.email} onChange={e => setNewClientForm(p => ({ ...p, email: e.target.value }))} className="flex-1" />
                <Input placeholder="Phone" type="tel" value={newClientForm.phone} onChange={e => setNewClientForm(p => ({ ...p, phone: e.target.value }))} className="flex-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowNewClient(false)} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
                <Button onClick={handleCreateClient} loading={savingClient} className="flex-1 !min-h-[40px] text-xs">Add Client</Button>
              </div>
            </div>
          )}
          {form.client_id && (() => {
            const selected = clients.find(c => c.id === form.client_id)
            return selected ? (
              editingClient ? (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Client</p>
                  <Input placeholder="Name" value={editClientForm.name} onChange={e => setEditClientForm(p => ({ ...p, name: e.target.value }))} />
                  <div className="flex gap-2">
                    <Input placeholder="Email" type="email" value={editClientForm.email} onChange={e => setEditClientForm(p => ({ ...p, email: e.target.value }))} className="flex-1" />
                    <Input placeholder="Phone" type="tel" value={editClientForm.phone} onChange={e => setEditClientForm(p => ({ ...p, phone: e.target.value }))} className="flex-1" />
                  </div>
                  <Input placeholder="Address" value={editClientForm.address} onChange={e => setEditClientForm(p => ({ ...p, address: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditingClient(false)} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
                    <Button loading={savingClient} onClick={async () => {
                      setSavingClient(true)
                      await updateClient(selected.id, editClientForm)
                      setEditingClient(false)
                      setSavingClient(false)
                    }} className="flex-1 !min-h-[40px] text-xs">Save</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                    {selected.name?.charAt(0)}
                  </div>
                  <div className="text-sm space-y-0.5 min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    {selected.email && <p className="text-gray-500 truncate">{selected.email}</p>}
                    {selected.phone && <p className="text-gray-500">{selected.phone}</p>}
                    {selected.address && <p className="text-gray-400 truncate">{selected.address}</p>}
                  </div>
                  <button type="button" onClick={() => { setEditClientForm({ name: selected.name || '', email: selected.email || '', phone: selected.phone || '', address: selected.address || '' }); setEditingClient(true) }} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
              )
            ) : null
          })()}
          {form.client_id && (
            <Select label="Job Site" value={form.job_site_id} onChange={e => handleJobSiteSelect(e.target.value)} options={[{ value: '', label: 'Select site...' }, { value: '__new__', label: '+ New Site' }, ...clientSites.map(s => ({ value: s.id, label: s.address }))]} />
          )}
          {showNewSite && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Add Site</p>
              <Input placeholder="Site address" value={newSiteForm.address} onChange={e => setNewSiteForm(p => ({ ...p, address: e.target.value }))} />
              <Input placeholder="Notes (optional)" value={newSiteForm.notes} onChange={e => setNewSiteForm(p => ({ ...p, notes: e.target.value }))} />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowNewSite(false)} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
                <Button onClick={handleCreateSite} loading={savingSite} className="flex-1 !min-h-[40px] text-xs">Add Site</Button>
              </div>
            </div>
          )}
          <Select label="Job Type" value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))} options={[{ value: '', label: 'Select type...' }, ...allJobTypes]} />
          <div className="flex gap-2">
            <Input label="Date" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} className="flex-1" />
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