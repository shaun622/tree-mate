import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { statusLabel, formatDate } from '../lib/utils'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()
  const [job, setJob] = useState(null)
  const [client, setClient] = useState(null)
  const [site, setSite] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

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

  const updateStatus = async (status) => {
    setUpdating(true)
    const updates = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'in_progress' && !job.started_at) updates.started_at = new Date().toISOString()
    const { data } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
    if (data) setJob(data)
    setUpdating(false)
  }

  const badgeVariant = { scheduled: 'info', in_progress: 'primary', on_hold: 'warning', completed: 'success' }

  if (loading) return <PageWrapper><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title={job?.job_type || 'Job'} back="/jobs" />

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
      </div>
    </PageWrapper>
  )
}