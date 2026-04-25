import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { statusLabel, formatDate } from '../lib/utils'

export default function JobSiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()
  const [site, setSite] = useState(null)
  const [reports, setReports] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const [siteRes, reportsRes] = await Promise.all([
        supabase.from('job_sites').select('*').eq('id', id).single(),
        supabase.from('job_reports').select('*').eq('job_site_id', id).order('created_at', { ascending: false }),
      ])
      setSite(siteRes.data)
      setReports(reportsRes.data || [])

      // Fetch photos from all reports for this site
      if (reportsRes.data?.length) {
        const reportIds = reportsRes.data.map(r => r.id)
        const { data: photoData } = await supabase.from('job_photos').select('*').in('job_report_id', reportIds).order('created_at', { ascending: false })
        setPhotos(photoData || [])
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return <PageWrapper><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>

  const hazards = site?.hazards || []

  return (
    <PageWrapper>
      <Header title={site?.address || 'Job Site'} back />

      <div className="px-4 py-4 space-y-4">
        {/* Site Info */}
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{site?.address}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{statusLabel(site?.site_type)}</Badge>
            <Badge variant={site?.site_access === 'easy' ? 'success' : site?.site_access === 'difficult' ? 'warning' : 'danger'}>{statusLabel(site?.site_access)}</Badge>
            {site?.regular_maintenance && <Badge variant="primary">Maintenance Contract</Badge>}
          </div>
          {hazards.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1.5">Hazards</p>
              <div className="flex flex-wrap gap-1.5">
                {hazards.map(h => <Badge key={h} variant="danger">{statusLabel(h)}</Badge>)}
              </div>
            </div>
          )}
          {site?.regular_maintenance && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-500">Frequency: <strong>{site.maintenance_frequency}</strong></p>
              {site.next_due_at && <p className="text-sm text-gray-600 dark:text-gray-500">Next visit: <strong>{formatDate(site.next_due_at)}</strong></p>}
            </div>
          )}
          {site?.notes && <p className="text-sm text-gray-500 dark:text-gray-500 italic">{site.notes}</p>}
        </Card>

        {/* Start Job Report */}
        <Button onClick={() => navigate(`/sites/${id}/report`)} className="w-full">
          Start Job Report
        </Button>

        {/* Photos */}
        {photos.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Photos ({photos.length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 9).map(p => (
                <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={p.signed_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">{p.tag}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Job Reports History */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Job Reports ({reports.length})</h3>
          {reports.length === 0 ? (
            <EmptyState title="No reports yet" description="Complete a job report to see it here" />
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <Card key={r.id} hover onClick={() => navigate(`/reports/${r.id}`)} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(r.created_at)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">{r.technician_name || 'No tech assigned'}</p>
                    </div>
                    <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{statusLabel(r.status)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
