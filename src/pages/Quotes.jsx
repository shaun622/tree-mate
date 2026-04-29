import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import { Plus } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { statusLabel, formatDate, formatCurrency, cn } from '../lib/utils'

export default function Quotes() {
  const { business } = useBusiness()
  const { clients } = useClients(business?.id)
  const { jobSites } = useJobSites(business?.id)
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (!business?.id) return
    supabase.from('quotes').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      .then(({ data }) => { setQuotes(data || []); setLoading(false) })
  }, [business?.id])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const siteMap = Object.fromEntries(jobSites.map(s => [s.id, s]))

  // Auto-select first quote on desktop
  useEffect(() => {
    if (selectedId == null && quotes.length > 0) setSelectedId(quotes[0].id)
  }, [quotes, selectedId])

  const selected = quotes.find(q => q.id === selectedId)

  const totalPipeline = quotes
    .filter(q => ['sent','viewed','follow_up','accepted'].includes(q.status))
    .reduce((s, q) => s + (q.total || 0), 0)

  const badgeVariant = (status) => {
    const map = {
      draft: 'neutral',
      sent: 'neutral',
      viewed: 'warning',
      follow_up: 'warning',
      accepted: 'success-solid',
      declined: 'danger',
    }
    return map[status] || 'neutral'
  }

  const stateLabel = (status) => {
    const map = {
      sent: 'Sent',
      viewed: 'Viewed',
      follow_up: 'Tender · awaiting',
      accepted: 'Accepted',
      declined: 'Declined',
      draft: 'Draft',
    }
    return map[status] || statusLabel(status)
  }

  return (
    <PageWrapper width="wide">
      <div className="md:hidden">
        <Header title="Quotes" rightAction={
          <button onClick={() => navigate('/quotes/new')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <Plus className="w-6 h-6 text-brand-600" strokeWidth={2.2} />
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-4">
        <div className="hidden md:block">
          <PageHero
            eyebrow="Pipeline"
            title={`${quotes.length} quote${quotes.length === 1 ? '' : 's'} · ${formatCurrency(totalPipeline)} in pipeline`}
            subtitle={null}
            action={
              <Button onClick={() => navigate('/quotes/new')}>
                <span className="text-[13px]">+ New quote</span>
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : quotes.length === 0 ? (
          <EmptyState title="No quotes" description="Create your first quote" actionLabel="New Quote" onAction={() => navigate('/quotes/new')} />
        ) : (
          <>
            {/* Mobile: stacked card list */}
            <div className="md:hidden space-y-2">
              {quotes.map(q => (
                <Card key={q.id} onClick={() => navigate(`/quotes/${q.id}`)} className="!p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-ink-1">{clientMap[q.client_id]?.name || 'Unknown'}</p>
                    <Badge variant={badgeVariant(q.status)}>{stateLabel(q.status)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink-3">{formatDate(q.created_at)}</p>
                    <p className="font-semibold text-ink-1 tabular-nums">{formatCurrency(q.total || 0)}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop: master-detail */}
            <div className="hidden md:grid md:grid-cols-12 gap-4">
              {/* Pipeline table */}
              <div className="md:col-span-7 xl:col-span-7 card !p-0 overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2 border-b border-line-2 bg-shell-2 section-title">
                  <div className="col-span-2">Ref</div>
                  <div className="col-span-5">Client / Work</div>
                  <div className="col-span-3">State</div>
                  <div className="col-span-2 text-right">Value</div>
                </div>
                <div className="divide-y divide-line-2">
                  {quotes.map(q => {
                    const isSelected = selectedId === q.id
                    const ref = q.quote_number || `TM-${String(q.id).slice(0, 4).toUpperCase()}`
                    const work = q.scope?.split('\n')[0]?.slice(0, 60) || 'Quote'
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedId(q.id)}
                        className={cn(
                          'grid grid-cols-12 w-full text-left px-4 py-3 items-center transition-colors',
                          isSelected ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-shell-2',
                        )}
                      >
                        <div className="col-span-2 text-[11px] font-mono font-medium text-brand-600 dark:text-brand-400 tracking-wider">{ref}</div>
                        <div className="col-span-5 min-w-0">
                          <div className="text-[13px] font-medium text-ink-1 truncate">{clientMap[q.client_id]?.name || 'Unknown'}</div>
                          <div className="text-[11.5px] text-ink-3 truncate">{work}</div>
                        </div>
                        <div className="col-span-3">
                          <Badge variant={badgeVariant(q.status)}>{stateLabel(q.status)}</Badge>
                        </div>
                        <div className="col-span-2 text-[13px] font-medium text-ink-1 tabular-nums text-right">
                          {formatCurrency(q.total || 0)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel — tree-domain fields */}
              <div className="md:col-span-5 xl:col-span-5">
                {selected ? (
                  <QuoteDetail quote={selected} client={clientMap[selected.client_id]} site={siteMap[selected.job_site_id]} stateLabel={stateLabel} badgeVariant={badgeVariant} navigate={navigate} />
                ) : (
                  <div className="card !p-8 text-center text-ink-3 text-sm">Select a quote to view details</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}

function QuoteDetail({ quote, client, site, stateLabel, badgeVariant, navigate }) {
  const ref = quote.quote_number || `TM-${String(quote.id).slice(0, 4).toUpperCase()}`
  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : []
  const hazards = Array.isArray(quote.hazards) ? quote.hazards : []

  return (
    <div className="card !p-5 sticky top-24">
      {/* Header — ref + client + state pill */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[11px] font-mono font-medium text-brand-600 dark:text-brand-400 tracking-wider mb-1">{ref}</div>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-1">{client?.name || 'Unknown'}</h2>
          {site?.address && <p className="text-[12px] text-ink-3 mt-0.5">{site.address}</p>}
        </div>
        <Badge variant={badgeVariant(quote.status)}>{stateLabel(quote.status)}</Badge>
      </div>

      {/* Tree-domain meta grid */}
      {(quote.species || quote.dbh_cm || quote.height_m || quote.spread_m || quote.prune_code) && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-y border-line-2 my-3">
          {quote.species && (
            <div>
              <div className="eyebrow-muted">Species</div>
              <div className="text-[13px] font-medium text-ink-1 mt-1 truncate">{quote.species}</div>
            </div>
          )}
          {(quote.dbh_cm || quote.height_m) && (
            <div>
              <div className="eyebrow-muted">DBH / Height</div>
              <div className="text-[13px] font-medium text-ink-1 mt-1 tabular-nums">
                {quote.dbh_cm ? `${quote.dbh_cm} cm` : '—'} · {quote.height_m ? `${quote.height_m} m` : '—'}
              </div>
            </div>
          )}
          {quote.spread_m && (
            <div>
              <div className="eyebrow-muted">Spread</div>
              <div className="text-[13px] font-medium text-ink-1 mt-1 tabular-nums">{quote.spread_m} m</div>
            </div>
          )}
          {quote.prune_code && (
            <div>
              <div className="eyebrow-muted">AS 4373</div>
              <div className="text-[13px] font-medium text-ink-1 mt-1">{quote.prune_code}</div>
            </div>
          )}
        </div>
      )}

      {/* Hazards */}
      {hazards.length > 0 && (
        <div className="mb-3">
          <div className="eyebrow-muted mb-2">Hazards</div>
          <div className="flex flex-wrap gap-1.5">
            {hazards.map((h, i) => (
              <Badge key={i} variant="warning">{typeof h === 'string' ? h : h.label || h.name}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="mb-3">
          <div className="eyebrow-muted mb-2">Line items</div>
          <div className="space-y-1.5">
            {lineItems.map((it, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-[12.5px]">
                <span className="text-ink-2 truncate flex-1 mr-3">{it.description || '—'}</span>
                <span className="font-mono tabular-nums text-ink-1 shrink-0">{formatCurrency((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-line-2">
        <div className="eyebrow-muted">Total</div>
        <div className="text-[22px] font-semibold tabular-nums tracking-tight text-brand-600 dark:text-brand-400">
          {formatCurrency(quote.total || 0)}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => navigate(`/quotes/${quote.id}`)} className="pill-ghost text-[12px]">Open quote →</button>
      </div>
    </div>
  )
}
