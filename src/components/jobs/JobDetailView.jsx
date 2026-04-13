import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ScheduleMap from '../schedule/ScheduleMap'
import { statusLabel, statusColor, formatDate, formatCurrency, JOB_STATUSES, PRIORITY_STYLES } from '../../lib/utils'

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

// ── 4-Stage Pipeline Stepper ─────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'quoted', label: 'Quoted', statuses: ['enquiry', 'site_visit', 'quoted'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['approved', 'scheduled', 'in_progress'] },
  { key: 'invoiced', label: 'Invoiced', statuses: ['completed', 'invoiced'] },
  { key: 'completed', label: 'Completed', statuses: ['paid'] },
]

function getStageIndex(status) {
  return PIPELINE_STAGES.findIndex(s => s.statuses.includes(status))
}

function PipelineStepper({ currentStatus, onStepClick }) {
  const currentIdx = getStageIndex(currentStatus)

  return (
    <div className="flex items-center justify-between px-2 pb-2">
      {PIPELINE_STAGES.map((stage, i) => {
        const isComplete = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={stage.key} className="flex items-center flex-1">
            {i > 0 && (
              <div className={`flex-1 h-0.5 transition-colors duration-300 ${isComplete ? 'bg-tree-400' : 'bg-gray-200'}`} />
            )}
            <button
              type="button"
              onClick={() => onStepClick?.(stage.key)}
              className="flex flex-col items-center gap-1.5 cursor-pointer px-1"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                isComplete ? 'bg-tree-500 border-tree-500 text-white shadow-glow hover:bg-tree-600' :
                isCurrent ? 'bg-white border-tree-500 text-tree-600 shadow-sm' :
                'bg-white border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400'
              }`}>
                {isComplete ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-tight text-center whitespace-nowrap transition-colors duration-300 ${
                isCurrent ? 'text-tree-600' : isComplete ? 'text-tree-500' : 'text-gray-300'
              }`}>
                {stage.label}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Status transition config (maps current DB status → next action) ─────────
const TRANSITIONS = {
  enquiry:     { next: 'quoted',     label: 'Create Quote',    navigateTo: 'quote' },
  site_visit:  { next: 'quoted',     label: 'Create Quote',    navigateTo: 'quote' },
  quoted:      { next: 'scheduled',  label: 'Schedule Job' },
  approved:    { next: 'scheduled',  label: 'Schedule Job' },
  scheduled:   { next: 'completed',  label: 'Complete Job' },
  in_progress: { next: 'completed',  label: 'Complete Job' },
  completed:   { next: 'invoiced',   label: 'Create Invoice',  navigateTo: 'invoice' },
  invoiced:    { next: 'paid',       label: 'Mark Paid' },
}

export default function JobDetailView({
  job, client, site, quote, staff = [], reports = [],
  onEdit, onDelete, onStatusChange, onCreateReport, onOpenReport,
  onCreateQuote, onCreateInvoice, onDepositCapture,
  updating = false, compact = false,
}) {
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Fetch photos attached directly to this job
  useEffect(() => {
    if (!job?.id) return
    supabase.from('job_photos').select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPhotos(data || []))
  }, [job?.id])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !job?.id) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `job-photos/${job.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const { data: photo } = await supabase.from('job_photos').insert({
        job_id: job.id,
        photo_url: publicUrl,
        tag: 'general',
      }).select().single()
      if (photo) setPhotos(prev => [photo, ...prev])
    }
    setUploadingPhoto(false)
  }

  if (!job) return null

  const hasCoords = site?.lat != null && site?.lng != null
  const assignedStaff = staff.find(s => s.id === job.staff_id)
  const showPriority = job.priority && job.priority !== 'normal'
  const pStyle = PRIORITY_STYLES[job.priority] || {}
  const transition = TRANSITIONS[job.status]

  const mapPoint = hasCoords ? [{
    id: job.id,
    lat: site.lat,
    lng: site.lng,
    label: job.job_type || 'Job',
    subtitle: site.address || '',
    time: job.scheduled_start ? formatTime(job.scheduled_start) : null,
  }] : []

  const handleTransition = () => {
    if (!transition) return
    if (transition.navigateTo === 'quote') {
      onCreateQuote?.()
    } else if (transition.navigateTo === 'invoice') {
      onCreateInvoice?.()
    } else {
      onStatusChange?.(transition.next)
    }
  }

  // Step click maps simplified stage keys to DB status changes
  const handleStepClick = (stageKey) => {
    const currentStageIdx = getStageIndex(job.status)
    const targetStageIdx = PIPELINE_STAGES.findIndex(s => s.key === stageKey)
    if (currentStageIdx === targetStageIdx) return // already here

    if (stageKey === 'quoted') {
      if (!quote && onCreateQuote) onCreateQuote()
      else onStatusChange?.('quoted')
    } else if (stageKey === 'scheduled') {
      onStatusChange?.('scheduled')
    } else if (stageKey === 'invoiced') {
      if (onCreateInvoice) onCreateInvoice()
      else onStatusChange?.('invoiced')
    } else if (stageKey === 'completed') {
      onStatusChange?.('paid')
    }
  }

  return (
    <div className="space-y-4">
      {/* Pipeline stepper */}
      <PipelineStepper currentStatus={job.status} onStepClick={handleStepClick} />

      {/* Hero: Map or gradient banner */}
      {hasCoords ? (
        <ScheduleMap points={mapPoint} height={compact ? 180 : 220} />
      ) : (
        <div className="h-28 rounded-2xl bg-gradient-to-br from-tree-500 via-tree-600 to-tree-700 flex items-center justify-center shadow-button">
          <svg className="w-10 h-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        </div>
      )}

      {/* Header card */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{job.job_type || 'Job'}</h2>
              {showPriority && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${pStyle.bg} ${pStyle.text}`}>
                  {statusLabel(job.priority)}
                </span>
              )}
            </div>
            {client && <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ${statusColor(job.status)}`}>
            {statusLabel(job.status)}
          </span>
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
        {job.site_visit_date && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            label="Site Visit"
            value={formatDate(job.site_visit_date)}
            sub={job.site_visit_time || null}
          />
        )}
        <InfoRow
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          label="Scheduled"
          value={job.scheduled_date ? formatDate(job.scheduled_date) : null}
          sub={job.scheduled_start ? `${formatTime(job.scheduled_start)}${job.scheduled_end ? ` – ${formatTime(job.scheduled_end)}` : ''}` : null}
        />
        <InfoRow
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>}
          label="Duration"
          value={job.duration_minutes ? `${job.duration_minutes} min` : null}
        />
        {job.estimated_duration && job.estimated_duration !== 'half_day' && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Estimated Duration"
            value={statusLabel(job.estimated_duration)}
          />
        )}
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
        {job.deposit_received && job.deposit_amount > 0 && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Deposit"
            value={formatCurrency(job.deposit_amount)}
            sub={`${job.deposit_payment_method ? job.deposit_payment_method.charAt(0).toUpperCase() + job.deposit_payment_method.slice(1) : ''}${job.deposit_date ? ` · ${formatDate(job.deposit_date)}` : ''}`}
          />
        )}
        {job.completion_notes && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Completion Notes"
            value={job.completion_notes}
          />
        )}
        {job.time_spent_hours > 0 && (
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Time Spent"
            value={`${job.time_spent_hours} hours`}
          />
        )}
      </Card>

      {/* Quote section */}
      {quote && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-900">Quote</h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${statusColor(quote.status)}`}>
              {statusLabel(quote.status)}
            </span>
          </div>
          <p className="text-lg font-bold text-tree-600">{formatCurrency(quote.total)}</p>
          {quote.line_items?.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{quote.line_items.length} line item{quote.line_items.length !== 1 ? 's' : ''}</p>
          )}
        </Card>
      )}
      {!quote && onCreateQuote && ['enquiry', 'site_visit', 'quoted'].includes(job.status) && (
        <Button variant="secondary" onClick={onCreateQuote} className="w-full">Create Quote</Button>
      )}

      {/* Primary action button (pipeline transition) */}
      {transition && onStatusChange && job.status !== 'paid' && (
        <Button onClick={handleTransition} loading={updating} className="w-full">
          {transition.label}
        </Button>
      )}

      {/* Create report */}
      {onCreateReport && ['scheduled', 'in_progress', 'completed'].includes(job.status) && site && (
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

      {/* Photos section */}
      {!compact && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Photos ({photos.length})</h3>
            <label className={`text-xs font-semibold text-tree-600 cursor-pointer ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingPhoto ? 'Uploading...' : '+ Add Photo'}
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-2xl overflow-hidden bg-gray-100 transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02]">
                  <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit/Delete actions */}
      <div className="flex gap-2">
        {onEdit && (
          <Button variant="secondary" onClick={onEdit} className="flex-1">Edit Job</Button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="flex-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 py-2.5 rounded-2xl font-semibold transition-all duration-200">
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
  const [quote, setQuote] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    if (!jobId) return
    setLoading(true)
    const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    setJob(jobData)
    if (jobData) {
      const [c, s, r, q] = await Promise.all([
        jobData.client_id ? supabase.from('clients').select('*').eq('id', jobData.client_id).single() : { data: null },
        jobData.job_site_id ? supabase.from('job_sites').select('*').eq('id', jobData.job_site_id).single() : { data: null },
        supabase.from('job_reports').select('*').eq('job_id', jobId).order('created_at', { ascending: false }),
        jobData.quote_id ? supabase.from('quotes').select('*').eq('id', jobData.quote_id).single() : { data: null },
      ])
      setClient(c.data)
      setSite(s.data)
      setReports(r.data || [])
      setQuote(q.data)
    }
    setLoading(false)
  }

  useEffect(() => { refetch() }, [jobId])

  return { job, client, site, quote, reports, loading, setJob, setClient, setSite, setQuote, refetch }
}
