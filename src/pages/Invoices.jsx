import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { statusLabel, formatDate, formatCurrency } from '../lib/utils'

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
  const badgeVariant = (status) => ({ draft: 'neutral', sent: 'info', paid: 'success', overdue: 'danger' }[status] || 'neutral')

  return (
    <PageWrapper>
      <Header title="Invoices" back="/settings" rightAction={
        <button onClick={() => navigate('/invoices/new')} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : invoices.length === 0 ? (
          <EmptyState title="No invoices" description="Create your first invoice" actionLabel="New Invoice" onAction={() => navigate('/invoices/new')} />
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <Card key={inv.id} hover onClick={() => navigate(`/invoices/${inv.id}`)} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{inv.invoice_number || 'Draft'}</p>
                  <Badge variant={badgeVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{clientMap[inv.client_id]?.name || 'Unknown'}</p>
                  <p className="font-semibold">{formatCurrency(inv.total || 0)}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">{formatDate(inv.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
