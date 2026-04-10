import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select, TextArea } from '../components/ui/Input'
import ClientPicker from '../components/pickers/ClientPicker'
import JobSitePicker from '../components/pickers/JobSitePicker'
import JobTypePicker from '../components/pickers/JobTypePicker'
import JobDetailView, { useJobDetail } from '../components/jobs/JobDetailView'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const { jobSites, createJobSite, updateJobSite, getJobSitesByClient } = useJobSites(business?.id)
  const { staff } = useStaff(business?.id)
  const { job, client, site, reports, loading, setJob, setClient, setSite } = useJobDetail(id)
  const [updating, setUpdating] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [jobTypes, setJobTypes] = useState([])

  useEffect(() => {
    if (!business?.id) return
    supabase.from('job_type_templates').select('*').eq('business_id', business.id).then(({ data }) => setJobTypes(data || []))
  }, [business?.id])

  const updateStatus = async (status) => {
    setUpdating(true)
    const updates = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'in_progress' && !job.started_at) updates.started_at = new Date().toISOString()
    const { data } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
    if (data) setJob(data)
    setUpdating(false)
  }

  const openEdit = () => {
    const startDt = job.scheduled_start ? new Date(job.scheduled_start) : null
    setEditForm({
      client_id: job.client_id || '',
      job_site_id: job.job_site_id || '',
      job_type: job.job_type || '',
      scheduled_date: job.scheduled_date || (startDt ? startDt.toISOString().split('T')[0] : ''),
      scheduled_time: startDt ? `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}` : '',
      duration_minutes: job.duration_minutes || 60,
      staff_id: job.staff_id || '',
      notes: job.notes || '',
      status: job.status || 'scheduled',
    })
    setShowEdit(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    let scheduled_start = null
    let scheduled_end = null
    if (editForm.scheduled_date && editForm.scheduled_time) {
      const startDt = new Date(`${editForm.scheduled_date}T${editForm.scheduled_time}`)
      scheduled_start = startDt.toISOString()
      scheduled_end = new Date(startDt.getTime() + (Number(editForm.duration_minutes) || 60) * 60000).toISOString()
    }
    const { data, error } = await supabase.from('jobs').update({
      client_id: editForm.client_id || null,
      job_site_id: editForm.job_site_id || null,
      job_type: editForm.job_type || null,
      scheduled_date: editForm.scheduled_date || null,
      scheduled_start,
      scheduled_end,
      duration_minutes: Number(editForm.duration_minutes) || 60,
      staff_id: editForm.staff_id || null,
      notes: editForm.notes || null,
      status: editForm.status,
    }).eq('id', id).select().single()
    if (!error && data) {
      setJob(data)
      // Refresh client/site if changed
      if (data.client_id !== client?.id) {
        const { data: c } = data.client_id ? await supabase.from('clients').select('*').eq('id', data.client_id).single() : { data: null }
        setClient(c)
      }
      if (data.job_site_id !== site?.id) {
        const { data: s } = data.job_site_id ? await supabase.from('job_sites').select('*').eq('id', data.job_site_id).single() : { data: null }
        setSite(s)
      }
      setShowEdit(false)
    }
    setSavingEdit(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this job? This cannot be undone.')) return
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (!error) navigate('/jobs')
  }

  const editClientSites = editForm?.client_id ? getJobSitesByClient(editForm.client_id) : []

  const createJobTypeTemplate = async (name) => {
    const { data, error } = await supabase
      .from('job_type_templates')
      .insert({ business_id: business.id, name })
      .select()
      .single()
    if (!error && data) setJobTypes(prev => [...prev, data])
  }

  if (loading) return <PageWrapper><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title={job?.job_type || 'Job'} back="/jobs" />

      <div className="px-4 py-4">
        <JobDetailView
          job={job}
          client={client}
          site={site}
          staff={staff}
          reports={reports}
          updating={updating}
          onStatusChange={updateStatus}
          onEdit={openEdit}
          onDelete={handleDelete}
          onCreateReport={site ? () => navigate(`/sites/${site.id}/report`) : null}
          onOpenReport={(rid) => navigate(`/reports/${rid}`)}
        />
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Job" size="lg">
        {editForm && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <ClientPicker
              clients={clients}
              value={editForm.client_id}
              onChange={(id) => setEditForm(p => ({ ...p, client_id: id, job_site_id: '' }))}
              onCreate={createClient}
              onUpdate={updateClient}
              required
            />
            <JobSitePicker
              sites={editClientSites}
              client={clients.find(c => c.id === editForm.client_id)}
              clientId={editForm.client_id}
              value={editForm.job_site_id}
              onChange={(id) => setEditForm(p => ({ ...p, job_site_id: id }))}
              onCreate={createJobSite}
              onUpdate={updateJobSite}
            />
            <JobTypePicker
              templates={jobTypes}
              value={editForm.job_type}
              onChange={(v) => setEditForm(p => ({ ...p, job_type: v }))}
              onCreateTemplate={createJobTypeTemplate}
            />
            <Select label="Status" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} options={[
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
            ]} />
            <div className="flex gap-2">
              <Input label="Date" type="date" value={editForm.scheduled_date} onChange={e => setEditForm(p => ({ ...p, scheduled_date: e.target.value }))} className="flex-1" />
              <Input label="Time" type="time" value={editForm.scheduled_time} onChange={e => setEditForm(p => ({ ...p, scheduled_time: e.target.value }))} className="flex-1" />
            </div>
            <Input label="Duration (min)" type="number" min="15" step="15" value={editForm.duration_minutes} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            {staff.length > 0 && (
              <Select label="Assign Staff" value={editForm.staff_id} onChange={e => setEditForm(p => ({ ...p, staff_id: e.target.value }))} options={[{ value: '', label: 'Unassigned' }, ...staff.map(s => ({ value: s.id, label: s.name }))]} />
            )}
            <TextArea label="Notes" placeholder="Job notes..." value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)} className="flex-1">Cancel</Button>
              <Button type="submit" loading={savingEdit} className="flex-1">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </PageWrapper>
  )
}
