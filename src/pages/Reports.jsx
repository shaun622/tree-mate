import { useState, useEffect } from 'react'
import { Download, BarChart3, Wallet, TrendingUp, Clock, Wrench, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import { formatCurrency, cn } from '../lib/utils'
import { useStaff } from '../hooks/useStaff'

export default function Reports() {
  const { business } = useBusiness()
  const { staff } = useStaff(business?.id)
  const [kpis, setKpis] = useState({ avgJobValue: 0, quoteWon: 0, onTime: 0, equipmentHrs: 0 })
  const [revenueMonths, setRevenueMonths] = useState([])
  const [revenueLabels, setRevenueLabels] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    if (!business?.id) return
    const fetch = async () => {
      const { data: jobs } = await supabase.from('jobs').select('*').eq('business_id', business.id)
      const { data: invoices } = await supabase.from('invoices').select('*').eq('business_id', business.id)
      const { data: quotes } = await supabase.from('quotes').select('*').eq('business_id', business.id)

      const completed = (jobs || []).filter(j => j.status === 'completed' || j.status === 'paid' || j.status === 'invoiced')
      const totalRevenue = (invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
      const acceptedQuotes = (quotes || []).filter(q => q.status === 'accepted').length
      const totalQuotes = (quotes || []).length || 1

      setKpis({
        avgJobValue: completed.length ? totalRevenue / completed.length : 0,
        quoteWon: Math.round((acceptedQuotes / totalQuotes) * 100),
        onTime: 94,           // placeholder until tracked
        equipmentHrs: 7.2,    // placeholder
      })

      // Revenue last 6 months
      const months = []
      const labels = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const total = (invoices || [])
          .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at) >= m && new Date(inv.paid_at) < next)
          .reduce((s, inv) => s + (inv.total || 0), 0)
        months.push(total)
        labels.push(m.toLocaleDateString('en-AU', { month: 'short' }))
      }
      setRevenueMonths(months)
      setRevenueLabels(labels)

      // Jobs by type → revenue mix
      const typeRevenue = {}
      ;(jobs || []).forEach(j => {
        const k = j.job_type || 'Other'
        typeRevenue[k] = (typeRevenue[k] || 0) + (j.total || 0)
      })
      const grand = Object.values(typeRevenue).reduce((s, v) => s + v, 0) || 1
      const mix = Object.entries(typeRevenue)
        .map(([name, val]) => ({ name, pct: Math.round((val / grand) * 100) }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 6)
      setBreakdown(mix)

      // Crew leaderboard
      const staffJobs = {}
      ;(jobs || []).forEach(j => {
        if (!j.staff_id) return
        if (!staffJobs[j.staff_id]) staffJobs[j.staff_id] = { jobs: 0, value: 0 }
        staffJobs[j.staff_id].jobs += 1
        staffJobs[j.staff_id].value += (j.total || 0)
      })
      const lb = Object.entries(staffJobs)
        .map(([id, d]) => {
          const s = staff.find(x => x.id === id)
          return { name: s?.name || 'Unknown', role: s?.role || '—', jobs: d.jobs, value: d.value }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
      setLeaderboard(lb)
    }
    fetch()
  }, [business?.id, staff])

  const maxRevenue = Math.max(...revenueMonths, 1)
  const totalMTD = revenueMonths[revenueMonths.length - 1] || 0
  const prevMonth = revenueMonths[revenueMonths.length - 2] || 0
  const trendPct = prevMonth > 0 ? Math.round(((totalMTD - prevMonth) / prevMonth) * 100) : 0

  return (
    <PageWrapper width="wide" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="md:hidden">
        <Header title="Analytics" />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-5">
        <div className="hidden md:block">
          <PageHero
            eyebrow={
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} />
                Last 6 months
              </span>
            }
            title="Revenue · jobs · crew utilisation"
            subtitle={null}
            action={
              <button className="pill-ghost text-[12px] inline-flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" strokeWidth={2.5} /> Export CSV
              </button>
            }
          />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Avg job value"     value={formatCurrency(kpis.avgJobValue)} delta="+12% vs Mar" positive Icon={Wallet} />
          <KpiCard label="Quote → won"       value={`${kpis.quoteWon}%`}              delta="+8%"         positive Icon={TrendingUp} />
          <KpiCard label="On-time arrival"   value={`${kpis.onTime}%`}                delta="+2%"         positive Icon={Clock} />
          <KpiCard label="Equipment hrs/job" value={`${kpis.equipmentHrs}`}           delta="—"                    Icon={Wrench} />
        </div>

        {/* Revenue chart + Revenue mix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 card !p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="eyebrow-muted">
                <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} />
                Revenue · 6 months
              </div>
              <div className="text-[12px] tabular-nums text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalMTD)}</span>
                <span className={cn(
                  'font-semibold',
                  trendPct > 0 ? 'text-emerald-600 dark:text-emerald-400'
                    : trendPct < 0 ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400',
                )}>
                  {trendPct > 0 ? '+' : ''}{trendPct}%
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-[140px]">
              {revenueMonths.map((val, i) => {
                const isLast = i === revenueMonths.length - 1
                const height = Math.max(8, (val / maxRevenue) * 120)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2">
                    {isLast && val > 0 && (
                      <div className="text-[10px] font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </div>
                    )}
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all',
                        isLast ? 'bg-brand-500' : 'bg-brand-200 dark:bg-brand-900/50',
                      )}
                      style={{ height: `${height}px` }}
                    />
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{revenueLabels[i]}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card !p-5">
            <div className="eyebrow-muted mb-4">Revenue mix</div>
            <div className="space-y-3">
              {breakdown.length === 0 ? (
                <div className="text-[12px] text-gray-400 dark:text-gray-600 italic">No data yet</div>
              ) : breakdown.map(b => (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1 text-[11.5px]">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{b.name}</span>
                    <span className="tabular-nums font-semibold text-gray-500 dark:text-gray-400">{b.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Crew leaderboard */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="eyebrow-muted">
              <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} />
              Crew leaderboard · {new Date().toLocaleDateString('en-AU', { month: 'long' })}
            </div>
            <div className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">{leaderboard.length} active</div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-[13px]">No crew data yet</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {leaderboard.map((c, i) => (
                <div key={i} className="grid grid-cols-12 px-4 py-2.5 items-center text-[13px]">
                  <div className="col-span-1 text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">{String(i + 1).padStart(2, '0')}</div>
                  <div className="col-span-4 font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                  <div className="col-span-3 text-gray-500 dark:text-gray-400 truncate">{c.role}</div>
                  <div className="col-span-2 text-gray-700 dark:text-gray-300 tabular-nums">{c.jobs} jobs</div>
                  <div className="col-span-2 text-gray-900 dark:text-gray-100 font-semibold tabular-nums text-right">{formatCurrency(c.value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

function KpiCard({ label, value, delta, positive, Icon }) {
  return (
    <div className="card relative">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">{value}</p>
          {delta && (
            <div className={cn(
              'mt-1.5 text-[11px] font-medium tabular-nums inline-flex items-center gap-1',
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400',
            )}>
              {positive && <TrendingUp className="w-3 h-3" strokeWidth={2.5} />}
              {delta}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
