import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ScheduleMap from '../components/schedule/ScheduleMap'
import JobDetailView, { useJobDetail } from '../components/jobs/JobDetailView'
import { geocodeAddress, totalRouteKm, estimateTravelMinutes, getRoadRoute } from '../lib/geocode'
import { statusLabel } from '../lib/utils'

const STATUS_COLORS = {
  enquiry: { border: '#a855f7', bg: 'bg-purple-50', text: 'text-purple-700', pin: '#a855f7' },
  site_visit: { border: '#0ea5e9', bg: 'bg-sky-50', text: 'text-sky-700', pin: '#0ea5e9' },
  quoted: { border: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700', pin: '#6366f1' },
  approved: { border: '#14b8a6', bg: 'bg-teal-50', text: 'text-teal-700', pin: '#14b8a6' },
  scheduled: { border: '#22c55e', bg: 'bg-tree-50', text: 'text-tree-700', pin: '#22c55e' },
  in_progress: { border: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', pin: '#3b82f6' },
  completed: { border: '#6b7280', bg: 'bg-gray-50', text: 'text-gray-700', pin: '#6b7280' },
  invoiced: { border: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', pin: '#f97316' },
  paid: { border: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', pin: '#10b981' },
}

function formatTime(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function ymd(d) { return d.toISOString().split('T')[0] }

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

// Get Monday of the week containing the given date
function startOfWeek(d) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function getWeekDays(baseDate) {
  const mon = startOfWeek(baseDate)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(d.getDate() + i)
    return d
  })
}

export default function Schedule() {
  const { business } = useBusiness()
  const { staff } = useStaff(business?.id)
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState('today') // 'today' | 'week' | 'upcoming' | 'map'
  const [jobs, setJobs] = useState([])
  const [weekJobs, setWeekJobs] = useState([])
  const [weekSites, setWeekSites] = useState({})
  const [weekClients, setWeekClients] = useState({})
  const [upcomingJobs, setUpcomingJobs] = useState([])
  const [upcomingSites, setUpcomingSites] = useState({})
  const [upcomingClients, setUpcomingClients] = useState({})
  const [sites, setSites] = useState({})
  const [clients, setClients] = useState({})
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [roadRoute, setRoadRoute] = useState(null)
  const [openJobId, setOpenJobId] = useState(null)
  const modalJob = useJobDetail(openJobId)
  const [modalUpdating, setModalUpdating] = useState(false)

  const modalUpdateStatus = async (status) => {
    if (!modalJob.job) return
    setModalUpdating(true)
    const updates = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'in_progress' && !modalJob.job.started_at) updates.started_at = new Date().toISOString()
    const { data } = await supabase.from('jobs').update(updates).eq('id', modalJob.job.id).select().single()
    if (data) {
      modalJob.setJob(data)
      setJobs(prev => prev.map(j => j.id === data.id ? data : j))
    }
    setModalUpdating(false)
  }

  // Fetch jobs for selected day
  useEffect(() => {
    if (!business?.id) return
    const fetchData = async () => {
      setLoading(true)
      const dayStr = ymd(selectedDate)
      const startISO = startOfDay(selectedDate).toISOString()
      const endISO = endOfDay(selectedDate).toISOString()

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', business.id)
        .or(`and(scheduled_start.gte.${startISO},scheduled_start.lte.${endISO}),scheduled_date.eq.${dayStr},site_visit_date.eq.${dayStr}`)
        .order('scheduled_start', { ascending: true, nullsFirst: false })

      const jobList = jobsData || []
      setJobs(jobList)

      const siteIds = [...new Set(jobList.filter(j => j.job_site_id).map(j => j.job_site_id))]
      const clientIds = [...new Set(jobList.filter(j => j.client_id).map(j => j.client_id))]
      const [sitesRes, clientsRes] = await Promise.all([
        siteIds.length ? supabase.from('job_sites').select('*').in('id', siteIds) : Promise.resolve({ data: [] }),
        clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : Promise.resolve({ data: [] }),
      ])
      const sitesMap = Object.fromEntries((sitesRes.data || []).map(s => [s.id, s]))
      setSites(sitesMap)
      setClients(Object.fromEntries((clientsRes.data || []).map(c => [c.id, c])))
      setLoading(false)

      // Geocode any sites missing lat/lng
      for (const site of (sitesRes.data || [])) {
        if (!site.lat && site.address) {
          const coords = await geocodeAddress(site.address)
          if (coords) {
            await supabase.from('job_sites').update({ lat: coords.lat, lng: coords.lng }).eq('id', site.id)
            setSites(prev => ({ ...prev, [site.id]: { ...prev[site.id], lat: coords.lat, lng: coords.lng } }))
          }
        }
      }
    }
    fetchData()
  }, [business?.id, selectedDate])

  // Fetch week jobs
  useEffect(() => {
    if (!business?.id || view !== 'week') return
    const fetchWeek = async () => {
      const days = getWeekDays(selectedDate)
      const weekStart = ymd(days[0])
      const weekEndISO = endOfDay(days[6]).toISOString()
      const weekStartISO = startOfDay(days[0]).toISOString()

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', business.id)
        .or(`and(scheduled_start.gte.${weekStartISO},scheduled_start.lte.${weekEndISO}),and(scheduled_date.gte.${weekStart},scheduled_date.lte.${ymd(days[6])}),and(site_visit_date.gte.${weekStart},site_visit_date.lte.${ymd(days[6])})`)
        .order('scheduled_start', { ascending: true, nullsFirst: false })

      const list = data || []
      setWeekJobs(list)

      const siteIds = [...new Set(list.filter(j => j.job_site_id).map(j => j.job_site_id))]
      const clientIds = [...new Set(list.filter(j => j.client_id).map(j => j.client_id))]
      const [sitesRes, clientsRes] = await Promise.all([
        siteIds.length ? supabase.from('job_sites').select('*').in('id', siteIds) : Promise.resolve({ data: [] }),
        clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : Promise.resolve({ data: [] }),
      ])
      setWeekSites(Object.fromEntries((sitesRes.data || []).map(s => [s.id, s])))
      setWeekClients(Object.fromEntries((clientsRes.data || []).map(c => [c.id, c])))
    }
    fetchWeek()
  }, [business?.id, view, selectedDate])

  // Fetch upcoming jobs
  useEffect(() => {
    if (!business?.id) return
    const fetchUpcoming = async () => {
      const today = ymd(startOfDay(new Date()))
      const nowISO = startOfDay(new Date()).toISOString()
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', business.id)
        .neq('status', 'completed')
        .or(`scheduled_start.gte.${nowISO},scheduled_date.gte.${today}`)
        .order('scheduled_start', { ascending: true, nullsFirst: false })
        .limit(50)
      const list = data || []
      setUpcomingJobs(list)
      const siteIds = [...new Set(list.filter(j => j.job_site_id).map(j => j.job_site_id))]
      const clientIds = [...new Set(list.filter(j => j.client_id).map(j => j.client_id))]
      const [sitesRes, clientsRes] = await Promise.all([
        siteIds.length ? supabase.from('job_sites').select('*').in('id', siteIds) : Promise.resolve({ data: [] }),
        clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : Promise.resolve({ data: [] }),
      ])
      setUpcomingSites(Object.fromEntries((sitesRes.data || []).map(s => [s.id, s])))
      setUpcomingClients(Object.fromEntries((clientsRes.data || []).map(c => [c.id, c])))
    }
    fetchUpcoming()
  }, [business?.id, jobs])

  // Map points
  const mapPoints = jobs
    .map((job, idx) => {
      const site = sites[job.job_site_id]
      if (!site?.lat || !site?.lng) return null
      const client = clients[job.client_id]
      return {
        id: job.id, lat: site.lat, lng: site.lng,
        label: job.job_type || 'Job',
        subtitle: `${client?.name || ''} · ${site.address || ''}`.trim(),
        time: job.scheduled_start ? formatTime(job.scheduled_start) : null,
      }
    })
    .filter(Boolean)

  const totalKm = totalRouteKm(mapPoints)
  const travelMin = estimateTravelMinutes(mapPoints)
  const displayKm = roadRoute?.distanceKm ?? totalKm
  const displayMin = roadRoute?.durationMin ?? travelMin

  const routeKey = mapPoints.map(p => `${p.id}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
  useEffect(() => {
    let cancelled = false
    if (mapPoints.length < 2) { setRoadRoute(null); return }
    getRoadRoute(mapPoints).then(r => { if (!cancelled) setRoadRoute(r) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  const goToDay = (offset) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    setSelectedDate(startOfDay(next))
  }

  const goToWeek = (offset) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + (offset * 7))
    setSelectedDate(startOfDay(next))
  }

  // Drag-and-drop reorder
  const handleDragStart = (id) => setDraggingId(id)
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id) }
  const handleDragEnd = () => { setDraggingId(null); setDragOverId(null) }
  const handleDrop = async (e, targetId) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) { handleDragEnd(); return }
    const fromIdx = jobs.findIndex(j => j.id === draggingId)
    const toIdx = jobs.findIndex(j => j.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return }
    const reordered = [...jobs]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setJobs(reordered)
    handleDragEnd()
    const baseHour = 8
    for (let i = 0; i < reordered.length; i++) {
      const newStart = new Date(selectedDate)
      newStart.setHours(baseHour + i, 0, 0, 0)
      const dur = reordered[i].duration_minutes || 60
      const newEnd = new Date(newStart.getTime() + dur * 60000)
      await supabase.from('jobs').update({
        scheduled_start: newStart.toISOString(),
        scheduled_end: newEnd.toISOString(),
        scheduled_date: ymd(newStart),
      }).eq('id', reordered[i].id)
    }
    const { data: refreshed } = await supabase
      .from('jobs')
      .select('*')
      .in('id', reordered.map(j => j.id))
    if (refreshed) {
      const orderMap = Object.fromEntries(reordered.map((j, i) => [j.id, i]))
      setJobs(refreshed.sort((a, b) => orderMap[a.id] - orderMap[b.id]))
    }
  }

  const isToday = ymd(selectedDate) === ymd(new Date())
  const dayLabel = selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  // Split jobs into site visits and scheduled work
  const siteVisits = jobs.filter(j => j.status === 'site_visit')
  const scheduledJobs = jobs.filter(j => j.status !== 'site_visit')

  // Get the day a job falls on (for week view grouping)
  const getJobDay = (job) => {
    if (job.status === 'site_visit' && job.site_visit_date) return job.site_visit_date
    if (job.scheduled_date) return job.scheduled_date
    if (job.scheduled_start) return ymd(new Date(job.scheduled_start))
    return null
  }

  // Render a job card (shared between today list and week view)
  const renderJobCard = (job, site, client, index, enableDrag = false) => {
    const sty = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled
    const isDragging = draggingId === job.id
    const isDragOver = dragOverId === job.id
    return (
      <div
        key={job.id}
        draggable={enableDrag}
        onDragStart={enableDrag ? () => handleDragStart(job.id) : undefined}
        onDragOver={enableDrag ? (e) => handleDragOver(e, job.id) : undefined}
        onDragEnd={enableDrag ? handleDragEnd : undefined}
        onDrop={enableDrag ? (e) => handleDrop(e, job.id) : undefined}
        className={`relative bg-white rounded-2xl shadow-card border-l-4 transition-all duration-200 ${isDragging ? 'opacity-40 scale-95' : ''} ${isDragOver ? 'ring-2 ring-tree-400' : ''}`}
        style={{ borderLeftColor: sty.border }}
      >
        <div onClick={() => setOpenJobId(job.id)} className="p-4 cursor-pointer">
          <div className="flex items-start gap-3">
            {enableDrag && (
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${sty.bg} ${sty.text}`}>
                  {index + 1}
                </div>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  className="touch-none p-1 text-gray-300 cursor-grab active:cursor-grabbing"
                  aria-label="Drag to reorder"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm6-10a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2z" /></svg>
                </button>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-gray-900 truncate">{job.job_type || 'Job'}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${sty.bg} ${sty.text}`}>
                  {statusLabel(job.status)}
                </span>
              </div>
              {client && <p className="text-sm text-gray-600 truncate">{client.name}</p>}
              {site?.address && <p className="text-xs text-gray-400 truncate">{site.address}</p>}
              <div className="flex items-center gap-3 mt-2">
                {job.scheduled_start && (
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {formatTime(job.scheduled_start)}
                    {job.scheduled_end && ` – ${formatTime(job.scheduled_end)}`}
                  </span>
                )}
                {job.staff_id && staff?.find(s => s.id === job.staff_id) && (
                  <span className="text-xs text-gray-500">
                    {staff.find(s => s.id === job.staff_id).name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render site visit card (compact, assessment style)
  const renderSiteVisitCard = (job, site, client) => {
    return (
      <div
        key={job.id}
        onClick={() => setOpenJobId(job.id)}
        className="bg-white rounded-2xl shadow-card border-l-4 p-4 cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.99]"
        style={{ borderLeftColor: STATUS_COLORS.site_visit.border }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-gray-900 truncate">{client?.name || 'Client'}</p>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-xl whitespace-nowrap bg-sky-50 text-sky-700 ring-1 ring-sky-200/50">
            Site Visit
          </span>
        </div>
        {site?.address && <p className="text-xs text-gray-400 truncate mt-0.5">{site.address}</p>}
        <div className="flex items-center gap-3 mt-2.5">
          {job.scheduled_start && (
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {formatTime(job.scheduled_start)}
            </span>
          )}
          {site?.address && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold text-tree-600 hover:text-tree-700 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Navigate
            </a>
          )}
        </div>
      </div>
    )
  }

  // Week view
  const renderWeekView = () => {
    const days = getWeekDays(selectedDate)
    const todayStr = ymd(new Date())

    return (
      <div className="space-y-4">
        {/* Week navigation */}
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => goToWeek(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center flex-1">
              <p className="text-sm font-bold text-gray-900">
                {days[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <button onClick={() => goToWeek(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </Card>

        {days.map(day => {
          const dayStr = ymd(day)
          const isDayToday = dayStr === todayStr
          const dayJobs = weekJobs.filter(j => getJobDay(j) === dayStr)
          const daySiteVisits = dayJobs.filter(j => j.status === 'site_visit')
          const dayWork = dayJobs.filter(j => j.status !== 'site_visit')

          if (dayJobs.length === 0) return (
            <div key={dayStr} className="space-y-1">
              <div className="flex items-center gap-2 px-1">
                <p className={`text-xs font-bold uppercase tracking-wide ${isDayToday ? 'text-tree-600' : 'text-gray-400'}`}>
                  {isDayToday ? 'Today' : day.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <p className="text-xs text-gray-400 px-1">No jobs</p>
            </div>
          )

          return (
            <div key={dayStr} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <p className={`text-xs font-bold uppercase tracking-wide ${isDayToday ? 'text-tree-600' : 'text-gray-500'}`}>
                  {isDayToday ? 'Today' : day.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-semibold text-gray-400">{dayJobs.length} job{dayJobs.length > 1 ? 's' : ''}</span>
              </div>
              {daySiteVisits.length > 0 && daySiteVisits.map(job => renderSiteVisitCard(job, weekSites[job.job_site_id], weekClients[job.client_id]))}
              {dayWork.map((job, i) => renderJobCard(job, weekSites[job.job_site_id], weekClients[job.client_id], i, false))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <PageWrapper width="wide">
      <Header title="Schedule" subtitle="Your daily site visits and jobs" />

      <div className="px-4 py-4 space-y-4">
        {/* Day picker (for today + map views) */}
        {(view === 'today' || view === 'map') && (
          <Card className="p-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => goToDay(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{isToday ? 'Today' : ''}</p>
                <p className="text-sm font-bold text-gray-900">{dayLabel}</p>
              </div>
              <button onClick={() => goToDay(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            {!isToday && (
              <button onClick={() => setSelectedDate(startOfDay(new Date()))} className="w-full mt-2 text-xs font-semibold text-tree-600 hover:text-tree-700 py-1">
                Jump to today
              </button>
            )}
          </Card>
        )}

        {/* View toggle — Today | Week | Upcoming | Map */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
          {['today', 'week', 'upcoming', 'map'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${view === v ? 'bg-white text-tree-600 shadow-card' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Travel summary */}
        {(view === 'today' || view === 'map') && mapPoints.length > 1 && (
          <div className="bg-gradient-to-r from-tree-500 to-tree-700 text-white rounded-2xl p-4 flex items-center gap-3 shadow-button">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 uppercase tracking-wide font-semibold">Total Route</p>
              <p className="text-base font-bold">{displayKm.toFixed(1)} km · ~{displayMin} min travel</p>
              {roadRoute && <p className="text-[10px] text-white/70 mt-0.5">via road network</p>}
            </div>
          </div>
        )}

        {/* === VIEW: TODAY === */}
        {view === 'today' && (
          loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              title="No jobs scheduled"
              description={`Nothing on the calendar for ${isToday ? 'today' : dayLabel}`}
              actionLabel="Create Job"
              onAction={() => navigate('/jobs')}
            />
          ) : (
            <div className="space-y-4">
              {/* Site Visits section */}
              {siteVisits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-sky-600">Site Visits</p>
                    <div className="flex-1 h-px bg-sky-200" />
                    <span className="text-[10px] font-semibold text-sky-500">{siteVisits.length}</span>
                  </div>
                  {siteVisits.map(job => renderSiteVisitCard(job, sites[job.job_site_id], clients[job.client_id]))}
                </div>
              )}

              {/* Jobs section */}
              {scheduledJobs.length > 0 && (
                <div className="space-y-2">
                  {siteVisits.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-tree-600">Jobs</p>
                      <div className="flex-1 h-px bg-tree-200" />
                      <span className="text-[10px] font-semibold text-tree-500">{scheduledJobs.length}</span>
                    </div>
                  )}
                  {scheduledJobs.map((job, index) => renderJobCard(job, sites[job.job_site_id], clients[job.client_id], index, true))}
                </div>
              )}
            </div>
          )
        )}

        {/* === VIEW: WEEK === */}
        {view === 'week' && renderWeekView()}

        {/* === VIEW: UPCOMING === */}
        {view === 'upcoming' && (
          upcomingJobs.length === 0 ? (
            <EmptyState
              icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              title="No upcoming jobs"
              description="Nothing scheduled ahead"
              actionLabel="Create Job"
              onAction={() => navigate('/jobs')}
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(
                upcomingJobs.reduce((acc, j) => {
                  const key = j.scheduled_date || (j.scheduled_start ? ymd(new Date(j.scheduled_start)) : 'unscheduled')
                  if (!acc[key]) acc[key] = []
                  acc[key].push(j)
                  return acc
                }, {})
              ).map(([dateKey, dayJobs]) => {
                const dateObj = dateKey === 'unscheduled' ? null : new Date(dateKey)
                const dayLbl = dateObj ? dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Unscheduled'
                const isDayToday = dateKey === ymd(new Date())
                return (
                  <div key={dateKey} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-tree-500/80">{isDayToday ? 'Today' : dayLbl}</p>
                      <div className="flex-1 h-px bg-tree-200/60" />
                      <span className="text-[10px] font-semibold text-tree-500/70">{dayJobs.length} job{dayJobs.length > 1 ? 's' : ''}</span>
                    </div>
                    {dayJobs.map(job => {
                      const site = upcomingSites[job.job_site_id]
                      const client = upcomingClients[job.client_id]
                      return (
                        <div
                          key={job.id}
                          onClick={() => setOpenJobId(job.id)}
                          className="bg-white border border-gray-100/80 rounded-2xl shadow-card p-4 cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-tree-800/90 truncate">{job.job_type || 'Job'}</p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap bg-white/70 text-tree-600/80">
                              {statusLabel(job.status)}
                            </span>
                          </div>
                          {client && <p className="text-sm text-tree-700/70 truncate">{client.name}</p>}
                          {site?.address && <p className="text-xs text-tree-600/60 truncate">{site.address}</p>}
                          {job.scheduled_start && (
                            <p className="text-xs font-semibold text-tree-600/80 mt-1.5 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {formatTime(job.scheduled_start)}
                              {job.scheduled_end && ` – ${formatTime(job.scheduled_end)}`}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* === VIEW: MAP === */}
        {view === 'map' && (
          loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              title="No jobs scheduled"
              description={`Nothing on the calendar for ${isToday ? 'today' : dayLabel}`}
              actionLabel="Create Job"
              onAction={() => navigate('/jobs')}
            />
          ) : (
            <>
              <ScheduleMap
                points={mapPoints}
                routeGeometry={roadRoute?.geometry}
                height={420}
                onMarkerClick={(p) => setOpenJobId(p.id)}
              />
              {mapPoints.length < jobs.length && (
                <p className="text-xs text-gray-500 text-center">
                  {jobs.length - mapPoints.length} job(s) without a mapped address
                </p>
              )}
            </>
          )
        )}
      </div>

      <Modal open={!!openJobId} onClose={() => setOpenJobId(null)} title="Job Details" size="lg">
        {modalJob.loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <JobDetailView
            job={modalJob.job}
            client={modalJob.client}
            site={modalJob.site}
            quote={modalJob.quote}
            staff={staff}
            reports={modalJob.reports}
            updating={modalUpdating}
            onStatusChange={modalUpdateStatus}
            onEdit={() => { setOpenJobId(null); navigate(`/jobs/${modalJob.job.id}`) }}
            onCreateReport={modalJob.site ? () => { setOpenJobId(null); navigate(`/sites/${modalJob.site.id}/report`) } : null}
            onOpenReport={(rid) => { setOpenJobId(null); navigate(`/reports/${rid}`) }}
            onCreateQuote={() => { setOpenJobId(null); navigate(`/quotes/new?job_id=${modalJob.job.id}`) }}
            onCreateInvoice={() => { setOpenJobId(null); navigate(`/invoices/new?job_id=${modalJob.job.id}`) }}
            compact
          />
        )}
      </Modal>
    </PageWrapper>
  )
}
