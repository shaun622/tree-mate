import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ScheduleMap from '../schedule/ScheduleMap'
import { statusLabel, formatDate } from '../../lib/utils'

const BADGE = { scheduled: 'info', in_progress: 'primary', on_hold: 'warning', completed: 'success' }

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function InfoRow({ icon, label, value, sub }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-tree-50 text-tree-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function JobDetailView({
  job, client, site, staff = [], reports = [],
  onEdit, onDelete, onStatusChange, onCreateReport, onOpenReport,
  updating = false, compact = false,
}) {
  if (!job) return null

  const hasCoords = site?.lat != null && site?.lng != null
  const assignedStaff = staff.find(s => s.id === job.staff_id)

  const mapPoint = hasCoords ? [{
    id: job.id,
    lat: site.lat,
    lng: site.lng,
    label: job.job_type || 'Job',
    subtitle: site.address || '',
    time: job.scheduled_start ? formatTime(job.scheduled_start) : null,
  }] : []

  return (
    <div className="space-y-4">
      {/* Hero: Map or gradient banner */}
      {hasCoords ? (
        <ScheduleMap points={mapPoint} height={compact ? 180 : 220} />
      ) : (
        <div className="h-32 rounded-2xl bg-gradient-to-br from-tree-500 via-tree-600 to-tree-700 flex items-center justify-center shadow-button">
          <svg className="w-12 h-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        </div>
      )}

      {/* Header card */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{job.job_type || 'Job'}</h2>
            {client && <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>}
          </div>
          <Badge variant={BADGE[job.status] || 'neutral'}>{statusLabel(job.status)}</Badge>
        </div>
        {job.notes && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed italic">{job.notes}</p>
        )}
      </Card>

      {/* Info rows */}
      <Card className="px-4">
        <InfoRow
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          label="Site Address"
          value={site?.address || 'No address set'}
          sub={site?.notes}
        />
        <InfoRow
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          label="Scheduled"
          value={job.scheduled_date ? formatDate(job.scheduled_date) : 'Not scheduled'}
          sub={job.scheduled_start ? `${formatTime(job.scheduled_start)}${job.scheduled_end ? ` – ${formatTime(job.scheduled_end)}` : ''}` : null}
        />
        <InfoRow
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>}
          label="Duration"
          value={job.duration_minutes ? `${job.duration_minutes} min` : null}
        />
        {assignedStaff && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Assigned To"
            value={assignedStaff.name}
          />
        )}
        {client?.phone && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
            label="Client Phone"
            value={<a href={`tel:${client.phone}`} className="text-tree-600 hover:underline">{client.phone}</a>}
          />
        )}
        {client?.email && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            label="Client Email"
            value={<a href={`mailto:${client.email}`} className="text-tree-600 hover:underline truncate block">{client.email}</a>}
          />
        )}
      </Card>

      {/* Status actions */}
      {onStatusChange && (
        <div className="flex gap-2">
          {job.status === 'scheduled' && (
            <Button onClick={() => onStatusChange('in_progress')} loading={updating} className="flex-1">Start Job</Button>
          )}
          {job.status === 'in_progress' && (
            <>
              <Button variant="secondary" onClick={() => onStatusChange('on_hold')} loading={updating} className="flex-1">Put On Hold</Button>
              <Button onClick={() => onStatusChange('completed')} loading={updating} className="flex-1">Complete</Button>
            </>
          )}
          {job.status === 'on_hold' && (
            <Button onClick={() => onStatusChange('in_progress')} loading={updating} className="flex-1">Resume</Button>
          )}
        </div>
      )}

      {/* Create report */}
      {onCreateReport && (job.status === 'in_progress' || job.status === 'completed') && site && (
        <Button variant="secondary" onClick={onCreateReport} className="w-full">Create Job Report</Button>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Job Reports</h3>
          <div className="space-y-2">
            {reports.map(r => (
              <Card key={r.id} hover onClick={() => onOpenReport?.(r.id)} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{formatDate(r.created_at)}</p>
                  <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{statusLabel(r.status)}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Delete actions */}
      <div className="flex gap-2">
        {onEdit && (
          <Button variant="secondary" onClick={onEdit} className="flex-1">Edit Job</Button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="flex-1 text-xs text-red-500 hover:text-red-700 py-2 font-semibold">
            Delete Job
          </button>
        )}
      </div>
    </div>
  )
}

// Standalone hook to fetch all the job data needed by JobDetailView
export function useJobDetail(jobId) {
  const [job, setJob] = useState(null)
  const [client, setClient] = useState(null)
  const [site, setSite] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    if (!jobId) return
    setLoading(true)
    const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    setJob(jobData)
    if (jobData) {
      const [c, s, r] = await Promise.all([
        jobData.client_id ? supabase.from('clients').select('*').eq('id', jobData.client_id).single() : { data: null },
        jobData.job_site_id ? supabase.from('job_sites').select('*').eq('id', jobData.job_site_id).single() : { data: null },
        supabase.from('job_reports').select('*').eq('job_id', jobId).order('created_at', { ascending: false }),
      ])
      setClient(c.data)
      setSite(s.data)
      setReports(r.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { refetch() }, [jobId])

  return { job, client, site, reports, loading, setJob, setClient, setSite, refetch }
}
