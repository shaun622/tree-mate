import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatCurrency, formatDate, statusLabel } from '../lib/utils'

export default function PublicQuote() {
  const { token } = useParams()
  const [quote, setQuote] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [responded, setResponded] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data: q } = await supabase.from('quotes').select('*').eq('token', token).single()
      if (q) {
        setQuote(q)
        // Mark as viewed
        if (q.status === 'sent') {
          await supabase.from('quotes').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', q.id)
        }
        const { data: b } = await supabase.from('businesses').select('name, logo_url, email, phone, abn').eq('id', q.business_id).single()
        setBusiness(b)
      }
      setLoading(false)
    }
    fetch()
  }, [token])

  const handleRespond = async (response) => {
    setResponding(true)
    await supabase.functions.invoke('respond-to-quote', {
      body: { quote_id: quote.id, response }
    })
    setResponded(true)
    setResponding(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!quote) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500 dark:text-gray-500">Quote not found</p></div>

  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Business Header */}
        <div className="text-center">
          {business?.logo_url && <img src={business.logo_url} alt="" className="w-16 h-16 rounded-xl mx-auto mb-3 object-cover" />}
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{business?.name || 'Quote'}</h1>
          {business?.email && <p className="text-sm text-gray-500 dark:text-gray-500">{business.email}</p>}
        </div>

        {/* Quote Details */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Quote</h2>
            <Badge variant={quote.status === 'accepted' ? 'success' : quote.status === 'declined' ? 'danger' : 'info'}>{statusLabel(quote.status)}</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Date: {formatDate(quote.created_at)}</p>

          {/* Line Items */}
          <div className="border rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-500">Description</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-500">Qty</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-500">Price</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.line_items || []).map((item, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-500">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-500">GST ({+((quote.gst_rate != null ? Number(quote.gst_rate) : 0.10) * 100).toFixed(2)}%)</span><span>{formatCurrency(quote.gst)}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t"><span>Total</span><span>{formatCurrency(quote.total)}</span></div>
          </div>

          {quote.scope && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Scope of Work</h3>
              <p className="text-sm text-gray-600 dark:text-gray-500 whitespace-pre-wrap">{quote.scope}</p>
            </div>
          )}
          {quote.terms && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Terms & Conditions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-500 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}
        </Card>

        {/* Response Actions */}
        {!responded && quote.status !== 'accepted' && quote.status !== 'declined' && (
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => handleRespond('decline')} loading={responding} className="flex-1">Decline</Button>
            <Button onClick={() => handleRespond('accept')} loading={responding} className="flex-1">Accept Quote</Button>
          </div>
        )}
        {responded && (
          <Card className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-brand-600 font-semibold text-lg mb-1">Thank you for your response!</p>
            <p className="text-gray-600 dark:text-gray-500 text-sm">Our team will reach out to you shortly to schedule the work.</p>
            {(business?.phone || business?.email) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-2">Need to make adjustments?</p>
                {business?.phone && <p className="text-sm text-gray-700 dark:text-gray-300"><a href={`tel:${business.phone}`} className="text-brand-600 font-medium">{business.phone}</a></p>}
                {business?.email && <p className="text-sm text-gray-700 dark:text-gray-300"><a href={`mailto:${business.email}`} className="text-brand-600 font-medium">{business.email}</a></p>}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
