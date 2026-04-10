import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScheduleMap from '../components/schedule/ScheduleMap'
import { geocodeAddress, totalRouteKm, estimateTravelMinutes, getRoadRoute } from '../lib/geocode'
import { statusLabel } from '../lib/utils'

const STATUS_COLORS = {
  scheduled: { border: '#22c55e', bg: 'bg-tree-50', text: 'text-tree-700', pin: '#22c55e' },
  in_progress: { border: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', pin: '#3b82f6' },
  on_hold: { border: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', pin: '#f59e0b' },
  completed: { border: '#6b7280', bg: 'bg-gray-50', text: 'text-gray-700', pin: '#6b7280' },
}

function formatTime(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function ymd(d) { return d.toISOString().split('T')[0] }

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

export default function Schedule() {
  const { business } = useBusiness()
  const { staff } = useStaff(business?.id)
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState('list') // 'list' | 'map'
  const [jobs, setJobs] = useState([])
  const [sites, setSites] = useState({}) // id -> site (with lat/lng)
  const [clients, setClients] = useState({})
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [roadRoute, setRoadRoute] = useState(null)

  // Fetch jobs for selected day (uses scheduled_start, falls back to scheduled_date)
  useEffect(() => {
    if (!business?.id) return
    const fetchData = async () => {
      setLoading(true)
      const dayStr = ymd(selectedDate)
      const startISO = startOfDay(selectedDate).toISOString()
      const endISO = endOfDay(selectedDate).toISOString()

      // Get jobs scheduled on this day (either via scheduled_start or scheduled_date)
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', business.id)
        .or(`and(scheduled_start.gte.${startISO},scheduled_start.lte.${endISO}),scheduled_date.eq.${dayStr}`)
        .order('scheduled_start', { ascending: true, nullsFirst: false })

      const jobList = jobsData || []
      setJobs(jobList)

      // Fetch related sites and clients
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

  // Build map points in route order from current jobs
  const mapPoints = jobs
    .map((job, idx) => {
      const site = sites[job.job_site_id]
      if (!site?.lat || !site?.lng) return null
      const client = clients[job.client_id]
      return {
        id: job.id,
        lat: site.lat,
        lng: site.lng,
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

  // Fetch road route when ordered points change
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
    // Persist new times: spread the day starting at 8am, 1hr each (if no times)
    // OR shift just the moved job's time to fit between neighbours
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
    // Refetch to get updated timestamps
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

  return (
    <PageWrapper>
      <Header title="Schedule" />

      <div className="px-4 py-4 space-y-4">
        {/* Day picker */}
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => goToDay(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{isToday ? 'Today' : ''}</p>
              <p className="text-sm font-bold text-gray-900">{dayLabel}</p>
            </div>
            <button onClick={() => goToDay(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {!isToday && (
            <button onClick={() => setSelectedDate(startOfDay(new Date()))} className="w-full mt-2 text-xs font-semibold text-tree-600 hover:text-tree-700 py-1">
              Jump to today
            </button>
          )}
        </Card>

        {/* View toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${view === 'list' ? 'bg-white text-tree-600 shadow-sm' : 'text-gray-500'}`}
          >
            List
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${view === 'map' ? 'bg-white text-tree-600 shadow-sm' : 'text-gray-500'}`}
          >
            Map
          </button>
        </div>

        {/* Travel summary */}
        {mapPoints.length > 1 && (
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

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            title="No jobs scheduled"
            description={`Nothing on the calendar for ${isToday ? 'today' : dayLabel}`}
            actionLabel="Create Job"
            onAction={() => navigate('/jobs')}
          />
        ) : view === 'map' ? (
          <>
            <ScheduleMap
              points={mapPoints}
              routeGeometry={roadRoute?.geometry}
              height={420}
              onMarkerClick={(p) => navigate(`/jobs/${p.id}`)}
            />
            {mapPoints.length < jobs.length && (
              <p className="text-xs text-gray-500 text-center">
                {jobs.length - mapPoints.length} job(s) without a mapped address
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {jobs.map((job, index) => {
              const site = sites[job.job_site_id]
              const client = clients[job.client_id]
              const sty = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled
              const isDragging = draggingId === job.id
              const isDragOver = dragOverId === job.id
              return (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => handleDragStart(job.id)}
                  onDragOver={(e) => handleDragOver(e, job.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, job.id)}
                  className={`relative bg-white rounded-2xl shadow-card border-l-4 transition-all duration-200 ${isDragging ? 'opacity-40 scale-95' : ''} ${isDragOver ? 'ring-2 ring-tree-400' : ''}`}
                  style={{ borderLeftColor: sty.border }}
                >
                  <div onClick={() => navigate(`/jobs/${job.id}`)} className="p-4 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${sty.bg} ${sty.text}`}>
                          {index + 1}
                        </div>
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          className="touch-none p-1 text-gray-300 cursor-grab active:cursor-grabbing"
                          aria-label="Drag to reorder"
                          title="Drag to reorder"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm6-10a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2zm0 5a1 1 0 100 2 1 1 0 000-2z" /></svg>
                        </button>
                      </div>
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
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
