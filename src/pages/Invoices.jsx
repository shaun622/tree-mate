import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import { Plus } from 'lucide-react'
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
    <PageWrapper width="wide">
      <div className="md:hidden">
        <Header title="Invoices" back="/settings" rightAction={
          <button onClick={() => navigate('/invoices/new')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <Plus className="w-6 h-6 text-brand-600" strokeWidth={2.2} />
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-4">
        <div className="hidden md:block">
          <PageHero
            eyebrow="Invoices"
            title={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · ${monthLabel}`}
            subtitle={null}
            action={
              <Button onClick={() => navigate('/invoices/new')}>
                <span className="text-[13px]">+ New invoice</span>
              </Button>
            }
          />
        </div>

        {/* 3-card summary strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryCard label={`Paid this month`} value={paidThisMonth} state="Healthy" stateVariant="success" />
          <SummaryCard label="Outstanding" value={outstanding} state="Pending" stateVariant="warning" />
          <SummaryCard label="Overdue" value={overdueTotal} state={overdueCount > 0 ? 'Action' : '—'} stateVariant={overdueCount > 0 ? 'danger' : 'neutral'} />
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : invoices.length === 0 ? (
          <EmptyState title="No invoices" description="Create your first invoice" actionLabel="New Invoice" onAction={() => navigate('/invoices/new')} />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-2">
              {enrichedInvoices.map(inv => (
                <Card key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="!p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-mono text-[12px] font-medium text-brand-600 dark:text-brand-400">{inv.invoice_number || 'Draft'}</p>
                    <Badge variant={badgeVariant(inv.computedStatus)}>{stateLabel(inv)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink-2">{clientMap[inv.client_id]?.name || 'Unknown'}</p>
                    <p className="font-semibold tabular-nums text-ink-1">{formatCurrency(inv.total || 0)}</p>
                  </div>
                  <p className="text-xs text-ink-3 mt-1">{formatDate(inv.created_at)}</p>
                </Card>
              ))}
            </div>

            {/* Desktop: clean table */}
            <div className="hidden md:block card !p-0 overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-line-2 bg-shell-2 section-title">
                <div className="col-span-2">Ref</div>
                <div className="col-span-3">Client</div>
                <div className="col-span-2">Value</div>
                <div className="col-span-3">State</div>
                <div className="col-span-2 text-right">Paid</div>
              </div>
              <div className="divide-y divide-line-2">
                {enrichedInvoices.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="grid grid-cols-12 gap-3 w-full text-left px-4 py-3 items-center hover:bg-shell-2 transition-colors"
                  >
                    <div className="col-span-2 text-[11px] font-mono font-medium text-brand-600 dark:text-brand-400 tracking-wider truncate">
                      {inv.invoice_number || `INV-${String(inv.id).slice(0, 4).toUpperCase()}`}
                    </div>
                    <div className="col-span-3 text-[13px] text-ink-1 truncate">{clientMap[inv.client_id]?.name || 'Unknown'}</div>
                    <div className="col-span-2 text-[13px] font-medium text-ink-1 tabular-nums">{formatCurrency(inv.total || 0)}</div>
                    <div className="col-span-3"><Badge variant={badgeVariant(inv.computedStatus)}>{stateLabel(inv)}</Badge></div>
                    <div className="col-span-2 text-[12px] font-mono text-ink-3 tabular-nums text-right">
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

function SummaryCard({ label, value, state, stateVariant }) {
  return (
    <div className="card relative">
      <div className="flex items-start justify-between mb-3">
        <div className="eyebrow-muted">{label}</div>
        <Badge variant={stateVariant}>{state}</Badge>
      </div>
      <div className="text-[28px] font-semibold tabular-nums tracking-tight text-ink-1 leading-none">
        {formatCurrency(value)}
      </div>
    </div>
  )
}
