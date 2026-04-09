import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useActivity } from '../hooks/useActivity'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ActivityPanel from '../components/ui/ActivityPanel'

export default function Dashboard() {
  const { business } = useBusiness()
  const { activities } = useActivity(business?.id)
  const navigate = useNavigate()
  const [stats, setStats] = useState({ jobsThisWeek: 0, activeJobs: 0, pendingQuotes: 0, overdueSites: 0 })

  useEffect(() => {
    if (!business?.id) return
    const fetchStats = async () => {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const [jobsWeek, activeJobs, pendingQuotes, overdueSites] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'completed').gte('completed_at', weekStart.toISOString()),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'in_progress'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('business_id', business.id).in('status', ['draft', 'sent', 'viewed', 'follow_up']),
        supabase.from('job_sites').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('regular_maintenance', true).lt('next_due_at', now.toISOString()),
      ])
      setStats({
        jobsThisWeek: jobsWeek.count || 0,
        activeJobs: activeJobs.count || 0,
        pendingQuotes: pendingQuotes.count || 0,
        overdueSites: overdueSites.count || 0,
      })
    }
    fetchStats()
  }, [business?.id])

  const kpis = [
    { label: 'Jobs This Week', value: stats.jobsThisWeek, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    { label: 'Active Jobs', value: stats.activeJobs, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, color: 'text-tree-600', bg: 'bg-tree-50', ring: 'ring-tree-100' },
    { label: 'Pending Quotes', value: stats.pendingQuotes, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    { label: 'Overdue Sites', value: stats.overdueSites, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-100' },
  ]

  return (
    <PageWrapper>
      <Header title="TreePro" rightAction={
        <button onClick={() => navigate('/settings')} className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      } />

      <div className="px-4 py-5 space-y-5">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-sm text-gray-400 mt-0.5">Here's your business overview</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(kpi => (
            <Card key={kpi.label} className="p-4 group hover:shadow-card-hover transition-all duration-300">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} ring-1 ${kpi.ring} flex items-center justify-center mb-3 ${kpi.color} group-hover:scale-110 transition-transform duration-200`}>
                {kpi.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{kpi.label}</p>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2.5">
          <Button onClick={() => navigate('/jobs')} className="flex-1 text-sm">New Job</Button>
          <Button variant="secondary" onClick={() => navigate('/quotes/new')} className="flex-1 text-sm">New Quote</Button>
          <Button variant="secondary" onClick={() => navigate('/clients')} className="flex-1 text-sm">Add Client</Button>
        </div>

        {/* Recent Activity */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Activity</h3>
          <ActivityPanel activities={activities.slice(0, 10)} />
        </Card>
      </div>
    </PageWrapper>
  )
}
