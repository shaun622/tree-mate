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
import { formatCurrency, statusLabel } from '../lib/utils'

const PIPELINE_STAGES = [
  { key: 'enquiry', label: 'Enquiries', color: 'bg-purple-500', lightBg: 'bg-purple-50', text: 'text-purple-700' },
  { key: 'site_visit', label: 'Site Visits', color: 'bg-sky-500', lightBg: 'bg-sky-50', text: 'text-sky-700' },
  { key: 'quoted', label: 'Quoted', color: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700', attention: true },
  { key: 'approved', label: 'Approved', color: 'bg-teal-500', lightBg: 'bg-teal-50', text: 'text-teal-700' },
  { key: 'scheduled', label: 'Scheduled', color: 'bg-green-500', lightBg: 'bg-green-50', text: 'text-green-700' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500', lightBg: 'bg-blue-50', text: 'text-blue-700' },
]

export default function Dashboard() {
  const { business } = useBusiness()
  const { activities, unreadCount, markRead, markAllRead } = useActivity(business?.id)
  const navigate = useNavigate()
  const [pipelineCounts, setPipelineCounts] = useState({})
  const [todayStats, setTodayStats] = useState({ siteVisits: 0, jobs: 0, completed: 0, total: 0 })
  const [revenue, setRevenue] = useState({ completedValue: 0, pendingQuotes: 0, overdueInvoices: 0, overdueCount: 0 })

  useEffect(() => {
    if (!business?.id) return
    const fetchDashboard = async () => {
      // Pipeline counts
      const countPromises = PIPELINE_STAGES.map(stage =>
        supabase.from('jobs').select('id', { count: 'exact', head: true })
          .eq('business_id', business.id).eq('status', stage.key)
      )

      // Today's stats
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

      const [
        ...pipelineResults
      ] = await Promise.all(countPromises)

      const counts = {}
      PIPELINE_STAGES.forEach((stage, i) => {
        counts[stage.key] = pipelineResults[i].count || 0
      })
      setPipelineCounts(counts)

      // Today's jobs
      const { data: todayJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', business.id)
        .or(`scheduled_date.eq.${todayStr},site_visit_date.eq.${todayStr},and(scheduled_start.gte.${todayStart.toISOString()},scheduled_start.lte.${todayEnd.toISOString()})`)

      const tjList = todayJobs || []
      const siteVisitsToday = tjList.filter(j => j.status === 'site_visit').length
      const jobsToday = tjList.filter(j => j.status !== 'site_visit').length
      const completedToday = tjList.filter(j => j.status === 'completed').length
      setTodayStats({ siteVisits: siteVisitsToday, jobs: jobsToday, completed: completedToday, total: tjList.length })

      // Revenue: this month's completed work value
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const [completedRes, quotesRes, invoicesRes] = await Promise.all([
        supabase.from('quotes').select('total')
          .eq('business_id', business.id)
          .in('status', ['accepted'])
          .gte('created_at', monthStart),
        supabase.from('quotes').select('total')
          .eq('business_id', business.id)
          .in('status', ['sent', 'viewed', 'follow_up']),
        supabase.from('invoices').select('total, due_date')
          .eq('business_id', business.id)
          .eq('status', 'sent'),
      ])

      const completedValue = (completedRes.data || []).reduce((sum, q) => sum + (q.total || 0), 0)
      const pendingQuotes = (quotesRes.data || []).reduce((sum, q) => sum + (q.total || 0), 0)
      const overdueInvoicesList = (invoicesRes.data || []).filter(inv => inv.due_date && new Date(inv.due_date) < today)
      const overdueValue = overdueInvoicesList.reduce((sum, inv) => sum + (inv.total || 0), 0)

      setRevenue({
        completedValue,
        pendingQuotes,
        overdueInvoices: overdueValue,
        overdueCount: overdueInvoicesList.length,
      })
    }
    fetchDashboard()
  }, [business?.id])

  const scheduledForToday = todayStats.jobs + todayStats.siteVisits
  const completedOfTotal = todayStats.completed
  const progressPct = scheduledForToday > 0 ? Math.round((completedOfTotal / scheduledForToday) * 100) : 0

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PageWrapper width="wide">
      <div className="md:hidden">
      <Header title="TreePro" rightAction={
        <button onClick={() => navigate('/settings')} className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      } />
      </div>

      <div className="px-4 md:px-0 py-4 space-y-6">
        {/* Hero Section */}
        <div className="rounded-2xl bg-gradient-to-br from-tree-600 to-tree-800 p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-tree-200 text-sm font-medium">{greeting}</p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">{business?.name || 'TreePro'}</h2>
              <p className="text-tree-200 text-sm mt-1">{dateStr}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/schedule')} className="px-5 py-2.5 bg-white text-tree-700 rounded-xl text-sm font-semibold hover:bg-tree-50 transition-colors">
                View Schedule
              </button>
              <button onClick={() => navigate('/jobs')} className="px-5 py-2.5 border border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                Jobs
              </button>
            </div>
          </div>
        </div>

        {/* Two-column desktop layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — 60% */}
          <div className="flex-1 lg:w-3/5 space-y-6">
            {/* Pipeline Snapshot */}
            <Card className="p-4 md:p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Pipeline</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                {PIPELINE_STAGES.map(stage => {
                  const count = pipelineCounts[stage.key] || 0
                  const needsAttention = stage.attention && count > 0
                  return (
                    <button
                      key={stage.key}
                      onClick={() => navigate(`/jobs?status=${stage.key}`)}
                      className={`rounded-2xl p-3 text-center transition-all duration-200 active:scale-95 hover:shadow-card-hover ${needsAttention ? 'ring-2 ring-amber-300 bg-amber-50' : stage.lightBg}`}
                    >
                      <p className={`text-2xl font-bold ${needsAttention ? 'text-amber-700' : stage.text}`}>{count}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${needsAttention ? 'text-amber-600' : stage.text} opacity-70`}>{stage.label}</p>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Today's Summary */}
            <Card className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today's Summary</h3>
                  <p className="text-xs text-gray-300 mt-0.5">{today.toLocaleDateString('en-AU')}</p>
                </div>
                <button onClick={() => navigate('/schedule')} className="text-xs font-semibold text-tree-600 hover:text-tree-700 transition-colors">View Schedule</button>
              </div>

              {/* Progress bar */}
              {scheduledForToday > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-gray-600">{completedOfTotal} of {scheduledForToday} completed</p>
                    <p className="text-sm font-bold text-gray-900">{progressPct}%</p>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-tree-400 to-tree-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No jobs scheduled for today</p>
              )}

              {/* Stat pills */}
              <div className="flex gap-2">
                <div className="flex-1 bg-sky-50 rounded-2xl p-3 text-center transition-all duration-200 hover:shadow-card">
                  <p className="text-lg font-bold text-sky-700">{todayStats.siteVisits}</p>
                  <p className="text-[10px] font-semibold text-sky-600">Site Visits</p>
                </div>
                <div className="flex-1 bg-tree-50 rounded-2xl p-3 text-center transition-all duration-200 hover:shadow-card">
                  <p className="text-lg font-bold text-tree-700">{todayStats.jobs}</p>
                  <p className="text-[10px] font-semibold text-tree-600">Jobs</p>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-2xl p-3 text-center transition-all duration-200 hover:shadow-card">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-lg font-bold text-emerald-700">{todayStats.completed}</p>
                    {todayStats.completed > 0 && (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-600">Completed</p>
                </div>
              </div>
            </Card>

            {/* Revenue Snapshot */}
            <Card className="p-4 md:p-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Revenue This Month</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-tree-500" />
                    <span className="text-sm text-gray-600">Completed Work</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(revenue.completedValue)}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm text-gray-600">Pending Quotes</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{formatCurrency(revenue.pendingQuotes)}</span>
                </div>
                {revenue.overdueCount > 0 && (
                  <div className="flex items-center justify-between py-1 px-3 -mx-3 bg-red-50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-medium text-red-600">{revenue.overdueCount} Overdue Invoice{revenue.overdueCount > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(revenue.overdueInvoices)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-2.5">
              <Button onClick={() => navigate('/jobs')} className="flex-1 text-sm">New Job</Button>
              <Button variant="secondary" onClick={() => navigate('/quotes/new')} className="flex-1 text-sm">New Quote</Button>
              <Button variant="secondary" onClick={() => navigate('/clients')} className="flex-1 text-sm">Add Client</Button>
            </div>
          </div>

          {/* Right column — 40% */}
          <div className="lg:w-2/5">
            <Card className="p-4 md:p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  Recent Activity
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-tree-500 text-white rounded-full animate-scale-in">{unreadCount}</span>
                  )}
                </h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-semibold text-tree-600 hover:text-tree-700 transition-colors">Mark all read</button>
                )}
              </div>
              <ActivityPanel activities={activities.slice(0, 10)} onMarkRead={markRead} />
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
