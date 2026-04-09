import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { statusLabel, formatDate, formatDateTime } from '../lib/utils'

export default function JobReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [tasks, setTasks] = useState([])
  const [equipment, setEquipment] = useState([])
  const [assessments, setAssessments] = useState([])
  const [photos, setPhotos] = useState([])
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: r } = await supabase.from('job_reports').select('*').eq('id', id).single()
      setReport(r)
      const [tasksRes, eqRes, assessRes, photosRes] = await Promise.all([
        supabase.from('job_tasks').select('*').eq('job_report_id', id).order('created_at'),
        supabase.from('equipment_used').select('*').eq('job_report_id', id),
        supabase.from('tree_assessments').select('*').eq('job_report_id', id).order('tree_number'),
        supabase.from('job_photos').select('*').eq('job_report_id', id).order('created_at'),
      ])
      setTasks(tasksRes.data || [])
      setEquipment(eqRes.data || [])
      setAssessments(assessRes.data || [])
      setPhotos(photosRes.data || [])
      if (r?.job_site_id) {
        const { data: s } = await supabase.from('job_sites').select('*').eq('id', r.job_site_id).single()
        setSite(s)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return <PageWrapper><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>

  return (
    <PageWrapper>
      <Header title="Job Report" back />

      <div className="px-4 py-4 space-y-4">
        {/* Report Summary */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Report</h2>
            <Badge variant={report?.status === 'completed' ? 'success' : 'warning'}>{statusLabel(report?.status)}</Badge>
          </div>
          <p className="text-sm text-gray-600">Date: {formatDateTime(report?.created_at)}</p>
          {report?.technician_name && <p className="text-sm text-gray-600">Technician: {report.technician_name}</p>}
          {report?.completed_at && <p className="text-sm text-gray-600">Completed: {formatDateTime(report.completed_at)}</p>}
          {site && <p className="text-sm text-gray-600">Site: {site.address}</p>}
        </Card>

        {/* Tasks */}
        {tasks.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Tasks</h3>
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 py-1.5">
                {t.completed ? (
                  <svg className="w-5 h-5 text-tree-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>
                )}
                <span className={`text-sm ${t.completed ? 'text-gray-900' : 'text-gray-400'}`}>{t.task_name}</span>
              </div>
            ))}
          </Card>
        )}

        {/* Equipment */}
        {equipment.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Equipment Used</h3>
            {equipment.map(eq => (
              <div key={eq.id} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm">{eq.equipment_name}</span>
                <span className="text-sm text-gray-500">{eq.hours_used}h — ${eq.cost}</span>
              </div>
            ))}
          </Card>
        )}

        {/* Tree Assessments */}
        {assessments.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Tree Assessments</h3>
            {assessments.map(a => (
              <div key={a.id} className="py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium">Tree #{a.tree_number}: {a.species || 'Unknown'}</p>
                <p className="text-xs text-gray-500">
                  {a.diameter_dbh_cm}cm DBH, {a.height_m}m tall, {a.canopy_spread_m}m canopy
                </p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={a.health_condition === 'healthy' ? 'success' : a.health_condition === 'dead' ? 'danger' : 'warning'}>{statusLabel(a.health_condition)}</Badge>
                  <Badge variant="neutral">{statusLabel(a.action_taken)}</Badge>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {photos.map(p => (
                <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={p.signed_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">{p.tag}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stats */}
        {(report?.trees_removed || report?.trees_pruned || report?.stump_count || report?.debris_volume_m3) && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              {report.trees_removed > 0 && <p className="text-sm">Trees Removed: <strong>{report.trees_removed}</strong></p>}
              {report.trees_pruned > 0 && <p className="text-sm">Trees Pruned: <strong>{report.trees_pruned}</strong></p>}
              {report.stump_count > 0 && <p className="text-sm">Stumps Ground: <strong>{report.stump_count}</strong></p>}
              {report.debris_volume_m3 > 0 && <p className="text-sm">Debris: <strong>{report.debris_volume_m3} m3</strong></p>}
            </div>
            {report.herbicide_applied && <Badge variant="warning" className="mt-2">Herbicide Applied</Badge>}
            {report.ground_levelled && <Badge variant="success" className="mt-2 ml-1">Ground Levelled</Badge>}
          </Card>
        )}

        {report?.notes && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Notes</h3>
            <p className="text-sm text-gray-600">{report.notes}</p>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}