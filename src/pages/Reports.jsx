import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import { formatCurrency, cn } from '../lib/utils'
import { useStaff } from '../hooks/useStaff'
import { Download } from 'lucide-react'

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
    <PageWrapper width="wide">
      <div className="md:hidden">
        <Header title="Analytics" back="/settings" />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-4">
        <div className="hidden md:block">
          <PageHero
            eyebrow="Last 6 months"
            title="Revenue · jobs · crew utilisation"
            subtitle={null}
            action={
              <button className="pill-ghost text-[12px]"><Download className="w-3.5 h-3.5" /> Export CSV</button>
            }
          />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Avg job value" value={formatCurrency(kpis.avgJobValue)} delta={`+12% vs Mar`} positive />
          <KpiCard label="Quote → won"  value={`${kpis.quoteWon}%`} delta={`+8%`} positive />
          <KpiCard label="On-time arrival" value={`${kpis.onTime}%`} delta={`+2%`} positive />
          <KpiCard label="Equipment hrs/job" value={`${kpis.equipmentHrs}`} delta="—" />
        </div>

        {/* Revenue chart + Revenue mix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 card !p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="eyebrow-muted">Revenue · 6mo</div>
              <div className="text-[12px] font-mono tabular-nums text-ink-3">
                {formatCurrency(totalMTD)}{' '}
                <span className={trendPct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
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
                      <div className="text-[10px] font-mono font-medium text-brand-600 dark:text-brand-400 tabular-nums">
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
                    <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">{revenueLabels[i]}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card !p-5">
            <div className="eyebrow-muted mb-4">Revenue mix</div>
            <div className="space-y-3">
              {breakdown.length === 0 ? (
                <div className="text-[12px] text-ink-4 italic">No data yet</div>
              ) : breakdown.map(b => (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1 text-[11.5px]">
                    <span className="text-ink-2 truncate">{b.name}</span>
                    <span className="font-mono tabular-nums text-ink-3">{b.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-shell-3 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Crew leaderboard */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line-2 flex items-center justify-between">
            <div className="eyebrow-muted">Crew leaderboard · {new Date().toLocaleDateString('en-AU', { month: 'long' })}</div>
            <div className="text-[10px] font-mono text-ink-3">{leaderboard.length} active</div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="px-4 py-8 text-center text-ink-3 text-[13px]">No crew data yet</div>
          ) : (
            <div className="divide-y divide-line-2">
              {leaderboard.map((c, i) => (
                <div key={i} className="grid grid-cols-12 px-4 py-2.5 items-center text-[13px]">
                  <div className="col-span-1 text-[10px] font-mono font-medium text-ink-3 tabular-nums">{String(i + 1).padStart(2, '0')}</div>
                  <div className="col-span-4 font-medium text-ink-1 truncate">{c.name}</div>
                  <div className="col-span-3 text-ink-3 truncate">{c.role}</div>
                  <div className="col-span-2 text-ink-2 font-mono tabular-nums">{c.jobs} jobs</div>
                  <div className="col-span-2 text-ink-1 font-medium font-mono tabular-nums text-right">{formatCurrency(c.value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

function KpiCard({ label, value, delta, positive }) {
  return (
    <div className="card relative">
      <div className="eyebrow-muted mb-3">{label}</div>
      <div className="text-[26px] font-semibold tabular-nums tracking-tight text-ink-1 leading-none">{value}</div>
      {delta && (
        <div className={cn(
          'mt-2 text-[11px] font-mono tabular-nums',
          positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3',
        )}>
          {delta}
        </div>
      )}
    </div>
  )
}
