import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { statusLabel, formatDate, SUGGESTED_JOB_TYPES } from '../lib/utils'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()
  const { clients } = useClients(business?.id)
  const { jobSites, getJobSitesByClient } = useJobSites(business?.id)
  const { staff } = useStaff(business?.id)
  const [job, setJob] = useState(null)
  const [client, setClient] = useState(null)
  const [site, setSite] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [jobTypes, setJobTypes] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      setJob(jobData)
      if (jobData) {
        const [clientRes, siteRes, reportsRes] = await Promise.all([
          jobData.client_id ? supabase.from('clients').select('*').eq('id', jobData.client_id).single() : { data: null },
          jobData.job_site_id ? supabase.from('job_sites').select('*').eq('id', jobData.job_site_id).single() : { data: null },
          supabase.from('job_reports').select('*').eq('job_id', id).order('created_at', { ascending: false }),
        ])
        setClient(clientRes.data)
        setSite(siteRes.data)
        setReports(reportsRes.data || [])
      }
      setLoading(false)
    }
    fetch()
  }, [id])

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

  const allJobTypes = [
    ...jobTypes.map(t => ({ value: t.name, label: t.name })),
    ...SUGGESTED_JOB_TYPES.filter(s => !jobTypes.find(t => t.name === s.name)).map(s => ({ value: s.name, label: s.name }))
  ]
  const editClientSites = editForm?.client_id ? getJobSitesByClient(editForm.client_id) : []

  const badgeVariant = { scheduled: 'info', in_progress: 'primary', on_hold: 'warning', completed: 'success' }

  if (loading) return <PageWrapper><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title={job?.job_type || 'Job'} back="/jobs" rightAction={
        <button onClick={openEdit} className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95" aria-label="Edit job">
          <svg className="w-5 h-5 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{job?.job_type || 'Job'}</h2>
            <Badge variant={badgeVariant[job?.status] || 'neutral'}>{statusLabel(job?.status)}</Badge>
          </div>
          {client && <p className="text-sm text-gray-600">Client: <strong>{client.name}</strong></p>}
          {site && <p className="text-sm text-gray-600">Site: <strong>{site.address}</strong></p>}
          {job?.scheduled_date && <p className="text-sm text-gray-600">Scheduled: <strong>{formatDate(job.scheduled_date)}</strong></p>}
          {job?.notes && <p className="text-sm text-gray-500 italic">{job.notes}</p>}
        </Card>

        {/* Status Actions */}
        <div className="flex gap-2">
          {job?.status === 'scheduled' && (
            <Button onClick={() => updateStatus('in_progress')} loading={updating} className="flex-1">Start Job</Button>
          )}
          {job?.status === 'in_progress' && (
            <>
              <Button variant="secondary" onClick={() => updateStatus('on_hold')} loading={updating} className="flex-1">Put On Hold</Button>
              <Button onClick={() => updateStatus('completed')} loading={updating} className="flex-1">Complete</Button>
            </>
          )}
          {job?.status === 'on_hold' && (
            <Button onClick={() => updateStatus('in_progress')} loading={updating} className="flex-1">Resume</Button>
          )}
        </div>

        {/* Create Report */}
        {(job?.status === 'in_progress' || job?.status === 'completed') && site && (
          <Button variant="secondary" onClick={() => navigate(`/sites/${site.id}/report`)} className="w-full">
            Create Job Report
          </Button>
        )}

        {/* Reports */}
        {reports.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Job Reports</h3>
            <div className="space-y-2">
              {reports.map(r => (
                <Card key={r.id} hover onClick={() => navigate(`/reports/${r.id}`)} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{formatDate(r.created_at)}</p>
                    <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{statusLabel(r.status)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleDelete} className="w-full text-xs text-red-500 hover:text-red-700 py-2 font-semibold">
          Delete Job
        </button>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Job" size="lg">
        {editForm && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Select label="Client" value={editForm.client_id} onChange={e => setEditForm(p => ({ ...p, client_id: e.target.value, job_site_id: '' }))} options={[{ value: '', label: 'Select client...' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} required />
            {editForm.client_id && (
              <Select label="Job Site" value={editForm.job_site_id} onChange={e => setEditForm(p => ({ ...p, job_site_id: e.target.value }))} options={[{ value: '', label: 'Select site...' }, ...editClientSites.map(s => ({ value: s.id, label: s.address }))]} />
            )}
            <Select label="Job Type" value={editForm.job_type} onChange={e => setEditForm(p => ({ ...p, job_type: e.target.value }))} options={[{ value: '', label: 'Select type...' }, ...allJobTypes]} />
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
