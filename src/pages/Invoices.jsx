import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Receipt, Wallet, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { statusLabel, formatDate, formatCurrency, cn } from '../lib/utils'

export default function Invoices() {
  const { business } = useBusiness()
  const { clients } = useClients(business?.id)
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) return
    supabase.from('invoices').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      .then(({ data }) => { setInvoices(data || []); setLoading(false) })
  }, [business?.id])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const today = new Date()

  // Categorise invoices
  const enrichedInvoices = invoices.map(inv => {
    const isOverdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < today
    const daysOverdue = isOverdue ? Math.floor((today - new Date(inv.due_date)) / 86400000) : 0
    const computedStatus = isOverdue ? 'overdue' : inv.status
    return { ...inv, computedStatus, daysOverdue }
  })

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const paidThisMonth = enrichedInvoices
    .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at) >= monthStart)
    .reduce((s, i) => s + (i.total || 0), 0)
  const outstanding = enrichedInvoices
    .filter(i => i.computedStatus === 'sent')
    .reduce((s, i) => s + (i.total || 0), 0)
  const overdueTotal = enrichedInvoices
    .filter(i => i.computedStatus === 'overdue')
    .reduce((s, i) => s + (i.total || 0), 0)
  const overdueCount = enrichedInvoices.filter(i => i.computedStatus === 'overdue').length

  const monthLabel = today.toLocaleDateString('en-AU', { month: 'long' })

  const badgeVariant = (status) => ({
    draft: 'neutral',
    sent: 'success',
    paid: 'success-solid',
    overdue: 'danger',
  }[status] || 'neutral')

  const stateLabel = (inv) => {
    if (inv.computedStatus === 'overdue') return `Overdue · ${inv.daysOverdue}d`
    if (inv.status === 'sent' && inv.due_date) {
      // Net X label
      const daysFromCreated = inv.created_at ? Math.floor((today - new Date(inv.created_at)) / 86400000) : 0
      const due = new Date(inv.due_date)
      const net = Math.floor((due - new Date(inv.created_at)) / 86400000)
      if (net > 30) return `Sent · Net ${net}`
      return 'Sent'
    }
    return statusLabel(inv.status)
  }

  return (
    <PageWrapper width="wide" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="md:hidden">
        <Header title="Invoices" rightAction={
          <button onClick={() => navigate('/invoices/new')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" aria-label="New invoice">
            <Plus className="w-6 h-6 text-brand-600" strokeWidth={2.2} />
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-5">
        <div className="hidden md:block">
          <PageHero
            eyebrow={
              <span className="inline-flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5" strokeWidth={2.5} />
                Billing
              </span>
            }
            title={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · ${monthLabel}`}
            subtitle={null}
            action={
              <Button onClick={() => navigate('/invoices/new')} leftIcon={Plus}>
                <span className="text-[13px]">New invoice</span>
              </Button>
            }
          />
        </div>

        {/* KPI strip — gradient-soft Paid + tonal Outstanding + tonal Overdue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryCard
            label={`Paid in ${monthLabel}`}
            value={paidThisMonth}
            Icon={Wallet}
            tone="brand"
            highlight
          />
          <SummaryCard
            label="Outstanding"
            value={outstanding}
            Icon={Clock}
            tone={outstanding > 0 ? 'amber' : 'gray'}
          />
          <SummaryCard
            label="Overdue"
            value={overdueTotal}
            Icon={AlertTriangle}
            tone={overdueCount > 0 ? 'red' : 'gray'}
            footnote={overdueCount > 0 ? `${overdueCount} invoice${overdueCount === 1 ? '' : 's'} chasing` : 'All caught up'}
          />
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8" strokeWidth={1.5} />}
            title="No invoices" description="Create your first invoice"
            actionLabel="New Invoice" onAction={() => navigate('/invoices/new')}
          />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-2">
              {enrichedInvoices.map(inv => (
                <Card key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="!p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-semibold tabular-nums tracking-wider text-brand-600 dark:text-brand-400">{inv.invoice_number || 'Draft'}</p>
                    <Badge variant={badgeVariant(inv.computedStatus)}>{stateLabel(inv)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{clientMap[inv.client_id]?.name || 'Unknown'}</p>
                    <p className="font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(inv.total || 0)}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums mt-1">{formatDate(inv.created_at)}</p>
                </Card>
              ))}
            </div>

            {/* Desktop: clean table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-card overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 section-title">
                <div className="col-span-2">Ref</div>
                <div className="col-span-3">Client</div>
                <div className="col-span-2">Value</div>
                <div className="col-span-3">State</div>
                <div className="col-span-2 text-right">Paid</div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {enrichedInvoices.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="grid grid-cols-12 gap-3 w-full text-left px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="col-span-2 text-[11px] font-semibold tabular-nums text-brand-600 dark:text-brand-400 tracking-wider truncate">
                      {inv.invoice_number || `INV-${String(inv.id).slice(0, 4).toUpperCase()}`}
                    </div>
                    <div className="col-span-3 text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{clientMap[inv.client_id]?.name || 'Unknown'}</div>
                    <div className="col-span-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(inv.total || 0)}</div>
                    <div className="col-span-3"><Badge variant={badgeVariant(inv.computedStatus)}>{stateLabel(inv)}</Badge></div>
                    <div className="col-span-2 text-[12px] tabular-nums text-gray-500 dark:text-gray-400 text-right">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}

const TONE_STYLES = {
  brand: { iconBg: 'bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300', value: 'text-gray-900 dark:text-gray-100' },
  amber: { iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',     value: 'text-amber-700 dark:text-amber-300' },
  red:   { iconBg: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',             value: 'text-red-700 dark:text-red-300' },
  gray:  { iconBg: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',           value: 'text-gray-900 dark:text-gray-100' },
}

function SummaryCard({ label, value, Icon, tone = 'gray', highlight = false, footnote }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.gray
  return (
    <div className={cn(
      highlight
        ? 'rounded-2xl border border-brand-200/60 dark:border-brand-800/40 p-4 bg-gradient-brand-soft dark:bg-brand-950/20 shadow-card'
        : 'card',
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            highlight ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400',
          )}>{label}</p>
          <p className={cn('mt-2 text-2xl sm:text-3xl font-bold tabular-nums leading-none', styles.value)}>
            {formatCurrency(value)}
          </p>
          {footnote && (
            <p className={cn(
              'mt-1.5 text-xs font-medium',
              tone === 'red'   && 'text-red-600 dark:text-red-400',
              tone === 'amber' && 'text-amber-600 dark:text-amber-400',
              tone === 'gray'  && 'text-gray-500 dark:text-gray-400',
              tone === 'brand' && 'text-gray-500 dark:text-gray-400',
            )}>
              {footnote}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', styles.iconBg)}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
