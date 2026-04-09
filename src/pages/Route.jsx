import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { formatDate } from '../lib/utils'

export default function RoutePage() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [clients, setClients] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) return
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0]
      // Get today's jobs with sites
      const { data: jobs } = await supabase.from('jobs').select('*').eq('business_id', business.id).eq('scheduled_date', today).in('status', ['scheduled', 'in_progress'])
      // Get associated sites and clients
      if (jobs?.length) {
        const siteIds = [...new Set(jobs.filter(j => j.job_site_id).map(j => j.job_site_id))]
        const clientIds = [...new Set(jobs.filter(j => j.client_id).map(j => j.client_id))]
        const [sitesRes, clientsRes] = await Promise.all([
          siteIds.length ? supabase.from('job_sites').select('*').in('id', siteIds).order('route_order') : { data: [] },
          clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : { data: [] },
        ])
        setSites((sitesRes.data || []).map(s => ({ ...s, job: jobs.find(j => j.job_site_id === s.id) })))
        setClients(Object.fromEntries((clientsRes.data || []).map(c => [c.id, c])))
      }
      setLoading(false)
    }
    fetch()
  }, [business?.id])

  const moveUp = async (index) => {
    if (index === 0) return
    const newSites = [...sites]
    ;[newSites[index - 1], newSites[index]] = [newSites[index], newSites[index - 1]]
    setSites(newSites)
    // Update route_order in DB
    for (let i = 0; i < newSites.length; i++) {
      await supabase.from('job_sites').update({ route_order: i }).eq('id', newSites[i].id)
    }
  }

  const moveDown = async (index) => {
    if (index === sites.length - 1) return
    const newSites = [...sites]
    ;[newSites[index], newSites[index + 1]] = [newSites[index + 1], newSites[index]]
    setSites(newSites)
    for (let i = 0; i < newSites.length; i++) {
      await supabase.from('job_sites').update({ route_order: i }).eq('id', newSites[i].id)
    }
  }

  return (
    <PageWrapper>
      <Header title="Today's Route" />

      <div className="px-4 py-4 space-y-4">
        {/* Map Placeholder */}
        <Card className="p-8 text-center bg-gray-50">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          <p className="text-sm text-gray-400">Map integration coming soon</p>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : sites.length === 0 ? (
          <EmptyState title="No jobs today" description="Schedule jobs to see them on your daily route" />
        ) : (
          <div className="space-y-2">
            {sites.map((site, index) => (
              <Card key={site.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveUp(index)} className="p-1 hover:bg-gray-100 rounded" disabled={index === 0}>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => moveDown(index)} className="p-1 hover:bg-gray-100 rounded" disabled={index === sites.length - 1}>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/sites/${site.id}`)}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-tree-500 text-white text-xs flex items-center justify-center font-bold">{index + 1}</span>
                      <p className="font-medium text-gray-900 truncate">{site.address}</p>
                    </div>
                    <p className="text-sm text-gray-500 ml-8">{clients[site.client_id]?.name || ''}</p>
                    {site.job && <Badge variant="info" className="ml-8 mt-1">{site.job.job_type}</Badge>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}