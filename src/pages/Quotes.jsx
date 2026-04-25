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
import { statusLabel, formatDate, formatCurrency } from '../lib/utils'

const FILTERS = ['all', 'draft', 'sent', 'viewed', 'follow_up', 'accepted', 'declined']

export default function Quotes() {
  const { business } = useBusiness()
  const { clients } = useClients(business?.id)
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!business?.id) return
    supabase.from('quotes').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      .then(({ data }) => { setQuotes(data || []); setLoading(false) })
  }, [business?.id])

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  const badgeVariant = (status) => {
    const map = { draft: 'neutral', sent: 'info', viewed: 'warning', follow_up: 'warning', accepted: 'success', declined: 'danger' }
    return map[status] || 'neutral'
  }

  return (
    <PageWrapper>
      <div className="md:hidden">
        <Header title="Quotes" rightAction={
          <button onClick={() => navigate('/quotes/new')} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        } />
      </div>
      <div className="hidden md:block px-4 md:px-0 pt-4">
        <PageHero
          title="Quotes"
          action={<Button leftIcon={Plus} onClick={() => navigate('/quotes/new')}>New Quote</Button>}
        />
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === s ? 'bg-tree-500 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {s === 'all' ? 'All' : statusLabel(s)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No quotes" description="Create your first quote" actionLabel="New Quote" onAction={() => navigate('/quotes/new')} />
        ) : (
          <div className="space-y-2">
            {filtered.map(q => (
              <Card key={q.id} hover onClick={() => navigate(`/quotes/${q.id}`)} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{clientMap[q.client_id]?.name || 'Unknown'}</p>
                  <Badge variant={badgeVariant(q.status)}>{statusLabel(q.status)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{formatDate(q.created_at)}</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(q.total || 0)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
