import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useActivity } from '../hooks/useActivity'
import { ArrowRight, CalendarClock, Briefcase, Receipt, AlertTriangle, Wallet, Users, Activity, Sparkles, Settings as SettingsIcon } from 'lucide-react'
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
    <PageWrapper width="wide" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="md:hidden">
        <Header title="TreeMate" rightAction={
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-black/5 rounded-xl transition-colors" aria-label="Settings">
            <SettingsIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" strokeWidth={2} />
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-5">
        {/* Hero — eyebrow + big title + right-aligned New Job action pill */}
        <PageHero
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              {greeting}
            </span>
          }
          title={business?.name || 'TreeMate'}
          subtitle={`For arborists who'd rather be in the bucket than at a laptop`}
        />

        {/* KPI strip — AWC-spec icons + standard StatCard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Jobs this week"  value={kpis.thisWeek} icon={CalendarClock} onClick={() => navigate('/schedule')} />
          <StatCard label="Active jobs"     value={kpis.active}   icon={Briefcase}     onClick={() => navigate('/jobs')} />
          <StatCard label="Pending quotes"  value={kpis.pending}  icon={Receipt}       onClick={() => navigate('/quotes')} />
          <StatCard
            label="Overdue"
            value={kpis.overdue}
            icon={AlertTriangle}
            iconTone={kpis.overdue > 0 ? 'red' : 'brand'}
            trend={kpis.overdue > 0 ? -1 : 0}
            trendLabel={kpis.overdue === 0 ? '— All caught up' : `${kpis.overdue} action needed`}
            onClick={() => navigate('/invoices')}
          />
        </div>

        {/* Row: Revenue MTD (gradient-brand-soft, spans 2) + Clients (regular card) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl border border-brand-200/60 dark:border-brand-800/40 p-4 bg-gradient-brand-soft dark:bg-brand-950/20 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              Revenue (Month to date)
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">
              {formatCurrency(revenue.completedValue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">From completed jobs this month</p>
          </div>

          <div className="card cursor-pointer" onClick={() => navigate('/clients')}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clients</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">
                  {clientCount}
                </p>
                <button className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                  Open CRM <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                <Users className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Row: Today + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="card">
            <div className="eyebrow-muted mb-3">
              <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
              Today
            </div>
            <div className="space-y-2.5">
              <TodayRow label="Scheduled" count={scheduledForToday} />
              <TodayRow label="Completed" count={todayStats.completed} />
              <TodayRow label="Overdue"   count={revenue.overdueCount} />
            </div>
            <button onClick={() => navigate('/schedule')} className="mt-4 text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:gap-1.5 transition-all">
              Open schedule <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow-muted">
                <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
                Recent activity
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-brand-500 text-white rounded-full tabular-nums ml-1">{unreadCount}</span>
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
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
        {count}
      </span>
    </div>
  )
}
