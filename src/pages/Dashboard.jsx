import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useActivity } from '../hooks/useActivity'
import { ArrowUpRight } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import ActivityPanel from '../components/ui/ActivityPanel'
import { formatCurrency } from '../lib/utils'

export default function Dashboard() {
  const { business } = useBusiness()
  const { activities, unreadCount, markRead, markAllRead } = useActivity(business?.id)
  const navigate = useNavigate()
  const [pipelineCounts, setPipelineCounts] = useState({})
  const [todayStats, setTodayStats] = useState({ siteVisits: 0, jobs: 0, completed: 0, total: 0 })
  const [revenue, setRevenue] = useState({ completedValue: 0, pendingQuotes: 0, overdueInvoices: 0, overdueCount: 0 })
  const [clientCount, setClientCount] = useState(0)
  const [kpis, setKpis] = useState({ thisWeek: 0, active: 0, pending: 0, overdue: 0 })

  useEffect(() => {
    if (!business?.id) return
    const fetchDashboard = async () => {
      // Pipeline counts (legacy structure for back-compat)
      const stages = ['enquiry','site_visit','quoted','approved','scheduled','in_progress']
      const countPromises = stages.map(s =>
        supabase.from('jobs').select('id', { count: 'exact', head: true })
          .eq('business_id', business.id).eq('status', s)
      )

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const todayStart = new Date(today); todayStart.setHours(0,0,0,0)
      const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999)
      // Week boundaries (Mon → Sun)
      const weekStart = new Date(today); const day = weekStart.getDay() || 7
      weekStart.setDate(weekStart.getDate() - (day - 1)); weekStart.setHours(0,0,0,0)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)

      const [...pipelineResults] = await Promise.all(countPromises)
      const counts = {}; stages.forEach((s,i) => { counts[s] = pipelineResults[i].count || 0 })
      setPipelineCounts(counts)

      // Today's jobs
      const { data: todayJobs } = await supabase
        .from('jobs').select('*').eq('business_id', business.id)
        .or(`scheduled_date.eq.${todayStr},site_visit_date.eq.${todayStr},and(scheduled_start.gte.${todayStart.toISOString()},scheduled_start.lte.${todayEnd.toISOString()})`)
      const tj = todayJobs || []
      setTodayStats({
        siteVisits: tj.filter(j => j.status === 'site_visit').length,
        jobs:       tj.filter(j => j.status !== 'site_visit').length,
        completed:  tj.filter(j => j.status === 'completed').length,
        total:      tj.length,
      })

      // Revenue this month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const [completedRes, quotesRes, invoicesRes] = await Promise.all([
        supabase.from('quotes').select('total').eq('business_id', business.id).eq('status', 'accepted').gte('created_at', monthStart),
        supabase.from('quotes').select('total').eq('business_id', business.id).in('status', ['sent','viewed','follow_up']),
        supabase.from('invoices').select('total, due_date').eq('business_id', business.id).eq('status', 'sent'),
      ])
      const completedValue = (completedRes.data || []).reduce((s, q) => s + (q.total || 0), 0)
      const pendingQuotes  = (quotesRes.data || []).reduce((s, q) => s + (q.total || 0), 0)
      const overdueList    = (invoicesRes.data || []).filter(i => i.due_date && new Date(i.due_date) < today)
      const overdueValue   = overdueList.reduce((s, i) => s + (i.total || 0), 0)
      setRevenue({ completedValue, pendingQuotes, overdueInvoices: overdueValue, overdueCount: overdueList.length })

      // Top KPIs
      const [weekJobs, activeJobs, clientsCount] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('business_id', business.id)
          .gte('scheduled_start', weekStart.toISOString()).lt('scheduled_start', weekEnd.toISOString()),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('business_id', business.id)
          .in('status', ['scheduled','in_progress','approved']),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
      ])
      setKpis({
        thisWeek: weekJobs.count || 0,
        active:   activeJobs.count || 0,
        pending:  (quotesRes.data || []).length,
        overdue:  overdueList.length,
      })
      setClientCount(clientsCount.count || 0)
    }
    fetchDashboard()
  }, [business?.id])

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const scheduledForToday = todayStats.jobs + todayStats.siteVisits

  return (
    <PageWrapper width="wide">
      <div className="md:hidden">
        <Header title="TreeMate" rightAction={
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-5">
        {/* Hero — eyebrow + big title + right-aligned New Job action pill */}
        <PageHero
          eyebrow={greeting}
          title={business?.name || 'TreeMate'}
          subtitle={`For arborists who'd rather be in the bucket than at a laptop`}
          action={
            <Button size="md" onClick={() => navigate('/jobs?new=1')}>
              <span className="text-[13px]">+ New job</span>
            </Button>
          }
        />

        {/* KPI strip — 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Jobs this week"  value={kpis.thisWeek} onClick={() => navigate('/schedule')} />
          <StatCard label="Active jobs"     value={kpis.active}   onClick={() => navigate('/jobs')} />
          <StatCard label="Pending quotes"  value={kpis.pending}  onClick={() => navigate('/quotes')} />
          <StatCard label="Overdue"         value={kpis.overdue}  trend={kpis.overdue > 0 ? -1 : 0} trendLabel={kpis.overdue === 0 ? '— All caught up' : `${kpis.overdue} action needed`} onClick={() => navigate('/invoices')} />
        </div>

        {/* Row: Revenue MTD (wide) + Clients (narrow) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 card relative">
            <div className="eyebrow mb-2">Revenue (Month to date)</div>
            <div className="text-[34px] font-semibold tabular-nums tracking-tight text-ink-1 leading-none">
              {formatCurrency(revenue.completedValue)}
            </div>
            <div className="text-[12.5px] text-ink-3 mt-1.5">From completed jobs this month</div>
          </div>

          <div className="card relative group cursor-pointer" onClick={() => navigate('/clients')}>
            <div className="flex items-start justify-between mb-2">
              <div className="eyebrow-muted">Clients</div>
              <ArrowUpRight className="w-3.5 h-3.5 text-ink-4 opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
            </div>
            <div className="text-[34px] font-semibold tabular-nums tracking-tight text-ink-1 leading-none">{clientCount}</div>
            <div className="text-[12.5px] text-ink-3 mt-1.5">Across active divisions</div>
            <div className="text-[12.5px] text-brand-600 dark:text-brand-400 font-medium mt-1.5">Open CRM →</div>
          </div>
        </div>

        {/* Row: Today + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="card">
            <div className="eyebrow-muted mb-3">Today</div>
            <div className="space-y-2.5">
              <TodayRow label="Scheduled" count={scheduledForToday} />
              <TodayRow label="Completed" count={todayStats.completed} />
              <TodayRow label="Overdue"   count={revenue.overdueCount} />
            </div>
            <button onClick={() => navigate('/schedule')} className="text-[12.5px] text-brand-600 dark:text-brand-400 font-medium mt-4 hover:text-brand-700 transition-colors">
              Open schedule →
            </button>
          </div>

          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow-muted flex items-center gap-2">
                Recent activity
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-brand-500 text-white rounded-full tabular-nums">{unreadCount}</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">Mark all read</button>
              )}
            </div>
            <ActivityPanel activities={activities.slice(0, 6)} onMarkRead={markRead} />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function TodayRow({ label, count }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className="inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded-full bg-surface-3 text-[11px] font-mono font-medium tabular-nums text-ink-2">
        {count}
      </span>
    </div>
  )
}
