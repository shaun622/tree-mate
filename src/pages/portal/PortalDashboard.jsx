import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { TextArea } from '../../components/ui/Input'
import { statusLabel, formatDate } from '../../lib/utils'

export default function PortalDashboard() {
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [sites, setSites] = useState([])
  const [reports, setReports] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [surveyForm, setSurveyForm] = useState({ rating: 0, comment: '' })
  const [surveySubmitted, setSurveySubmitted] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/portal/login'); return }

      const { data: clientData } = await supabase.from('clients').select('*').eq('auth_user_id', user.id).single()
      if (!clientData) { navigate('/portal/login'); return }
      setClient(clientData)

      const { data: sitesData } = await supabase.from('job_sites').select('*').eq('client_id', clientData.id)
      setSites(sitesData || [])

      if (sitesData?.length) {
        const siteIds = sitesData.map(s => s.id)
        const { data: reportsData } = await supabase.from('job_reports').select('*').in('job_site_id', siteIds).order('created_at', { ascending: false })
        setReports(reportsData || [])

        if (reportsData?.length) {
          const reportIds = reportsData.map(r => r.id)
          const { data: photosData } = await supabase.from('job_photos').select('*').in('job_report_id', reportIds)
          setPhotos(photosData || [])
        }
      }
      setLoading(false)
    }
    fetch()
  }, [navigate])

  const handleSurvey = async () => {
    if (!surveyForm.rating) return
    await supabase.from('surveys').insert({
      business_id: client.business_id, client_id: client.id,
      rating: surveyForm.rating, comment: surveyForm.comment,
    })
    setSurveySubmitted(true)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/portal/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gradient-page">
      <header className="bg-gradient-brand px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Welcome, {client?.name}</h1>
            <p className="text-white/80 text-sm">Your job history and reports</p>
          </div>
          <button onClick={handleSignOut} className="px-3 py-1.5 bg-white/20 rounded-lg text-sm">Sign Out</button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Job Sites */}
        {sites.map(site => (
          <Card key={site.id} className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">{site.address}</h3>
            <Badge variant="neutral">{statusLabel(site.site_type)}</Badge>

            {/* Reports for this site */}
            {reports.filter(r => r.job_site_id === site.id).map(r => {
              const reportPhotos = photos.filter(p => p.job_report_id === r.id)
              return (
                <div key={r.id} className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{formatDate(r.created_at)}</p>
                    <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{statusLabel(r.status)}</Badge>
                  </div>
                  {r.notes && <p className="text-sm text-gray-600 mb-2">{r.notes}</p>}
                  {reportPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {reportPhotos.map(p => (
                        <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={p.signed_url} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0.5 left-0.5 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded">{p.tag}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        ))}

        {/* Survey */}
        {!surveySubmitted ? (
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">How was our service?</h3>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setSurveyForm(p => ({ ...p, rating: i }))} className="p-1">
                  <svg className={`w-8 h-8 ${i <= surveyForm.rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </button>
              ))}
            </div>
            <TextArea placeholder="Any comments? (optional)" value={surveyForm.comment} onChange={e => setSurveyForm(p => ({ ...p, comment: e.target.value }))} />
            <Button onClick={handleSurvey} className="w-full mt-3" disabled={!surveyForm.rating}>Submit Feedback</Button>
          </Card>
        ) : (
          <Card className="p-4 text-center">
            <p className="text-tree-600 font-medium">Thank you for your feedback!</p>
          </Card>
        )}
      </div>
    </div>
  )
}
