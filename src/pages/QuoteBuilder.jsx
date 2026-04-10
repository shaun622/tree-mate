import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input, TextArea, Select } from '../components/ui/Input'
import ClientPicker from '../components/pickers/ClientPicker'
import JobSitePicker from '../components/pickers/JobSitePicker'
import { calculateGST, formatCurrency } from '../lib/utils'
import { getPlanLimits, isTrialExpired } from '../lib/plans'
import UpgradePrompt from '../components/ui/UpgradePrompt'

export default function QuoteBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const { getJobSitesByClient, createJobSite, updateJobSite } = useJobSites(business?.id)
  const [quoteStatus, setQuoteStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [quoteLimitHit, setQuoteLimitHit] = useState(false)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [form, setForm] = useState({
    client_id: '', job_site_id: '', scope: '', terms: 'Payment due within 14 days of invoice.\nAll prices include GST.\nQuote valid for 30 days.',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
  })

  useEffect(() => {
    if (id) {
      supabase.from('quotes').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setForm({
            client_id: data.client_id || '',
            job_site_id: data.job_site_id || '',
            scope: data.scope || '',
            terms: data.terms || '',
            line_items: data.line_items || [{ description: '', quantity: 1, unit_price: 0 }],
          })
          setQuoteStatus(data.status)
        }
      })
    }
  }, [id])

  // Check monthly quote count for plan limits
  useEffect(() => {
    if (!business?.id || id) return
    const limits = getPlanLimits(business.plan)
    if (limits.quotesPerMonth === Infinity) return
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    supabase.from('quotes').select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', monthStart.toISOString())
      .then(({ count }) => {
        setMonthlyCount(count || 0)
        if ((count || 0) >= limits.quotesPerMonth) setQuoteLimitHit(true)
      })
  }, [business?.id, business?.plan, id])

  const clientSites = form.client_id ? getJobSitesByClient(form.client_id) : []

  const updateItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.line_items]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, line_items: items }
    })
  }

  const addItem = () => setForm(prev => ({ ...prev, line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0 }] }))
  const removeItem = (index) => setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) }))

  const subtotal = form.line_items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const { gst, total } = calculateGST(subtotal)

  const save = async (status = 'draft') => {
    const payload = {
      business_id: business.id,
      client_id: form.client_id || null,
      job_site_id: form.job_site_id || null,
      scope: form.scope,
      terms: form.terms,
      line_items: form.line_items,
      subtotal,
      gst,
      total,
      status,
    }
    if (id) {
      await supabase.from('quotes').update(payload).eq('id', id)
    } else {
      const { data } = await supabase.from('quotes').insert(payload).select().single()
      if (data) return data
    }
    return { id }
  }

  const handleSave = async () => {
    setSaving(true)
    await save('draft')
    setSaving(false)
    navigate('/quotes')
  }

  const handleSend = async () => {
    if (quoteStatus === 'accepted') {
      if (!confirm('Quote already accepted by customer. Are you sure you want to send an amended quote?')) return
    } else if (quoteStatus === 'sent' || quoteStatus === 'viewed') {
      if (!confirm('Quote has been sent and not responded to. Are you sure you want to send it again?')) return
    }
    setSending(true)
    const quote = await save('sent')
    if (quote?.id) {
      await supabase.functions.invoke('send-quote', { body: { quote_id: quote.id || id } })
    }
    setSending(false)
    navigate('/quotes')
  }

  return (
    <PageWrapper>
      <Header title={id ? 'Edit Quote' : 'New Quote'} back="/quotes" />

      <div className="px-4 py-4 space-y-4">
        {/* Status banner */}
        {quoteStatus === 'accepted' && (
          <div className="bg-gradient-to-r from-tree-500 to-tree-700 text-white rounded-2xl p-4 flex items-center gap-3 shadow-button">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">Quote Accepted</p>
              <p className="text-xs text-white/80">Customer has accepted this quote</p>
            </div>
          </div>
        )}
        {(quoteStatus === 'sent' || quoteStatus === 'viewed') && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-2xl p-4 flex items-center gap-3 shadow-button">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">Quote Sent</p>
              <p className="text-xs text-white/80">{quoteStatus === 'viewed' ? 'Customer has viewed this quote' : 'Awaiting customer response'}</p>
            </div>
          </div>
        )}
        {quoteStatus === 'declined' && (
          <div className="bg-gradient-to-r from-red-500 to-red-700 text-white rounded-2xl p-4 flex items-center gap-3 shadow-button">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">Quote Declined</p>
              <p className="text-xs text-white/80">Customer declined this quote</p>
            </div>
          </div>
        )}

        {/* Plan restriction check */}
        {isTrialExpired(business) && (
          <UpgradePrompt message="Your free trial has ended. Choose a plan to continue creating quotes." />
        )}
        {!id && quoteLimitHit && !isTrialExpired(business) && (
          <UpgradePrompt message={`You've used ${monthlyCount} of 10 quotes this month. Upgrade to Unlimited for unlimited quotes.`} />
        )}

        {/* Client & Site */}
        <Card className="p-4 space-y-3">
          <ClientPicker
            clients={clients}
            value={form.client_id}
            onChange={(id) => setForm(p => ({ ...p, client_id: id, job_site_id: '' }))}
            onCreate={createClient}
            onUpdate={updateClient}
          />
          <JobSitePicker
            sites={clientSites}
            clientId={form.client_id}
            value={form.job_site_id}
            onChange={(id) => setForm(p => ({ ...p, job_site_id: id }))}
            onCreate={createJobSite}
            onUpdate={updateJobSite}
          />
        </Card>

        {/* Line Items */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
          {form.line_items.map((item, i) => (
            <div key={i} className="space-y-2 mb-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
              <Input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              <div className="flex gap-2 items-end">
                <Input label="Qty" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-20" />
                <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="flex-1" />
                <p className="text-sm font-medium text-gray-900 pb-3 w-24 text-right">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</p>
                {form.line_items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="pb-3 text-red-400 hover:text-red-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addItem} className="w-full py-2 text-sm text-tree-600 font-medium hover:bg-tree-50 rounded-lg transition-colors">+ Add Line Item</button>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">GST (10%)</span><span>{formatCurrency(gst)}</span></div>
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </Card>

        {/* Scope & Terms */}
        <Card className="p-4 space-y-3">
          <TextArea label="Scope of Work" placeholder="Describe the work to be performed..." value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} />
          <TextArea label="Terms & Conditions" value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} />
        </Card>

        {/* Actions */}
        {!(isTrialExpired(business) || (!id && quoteLimitHit)) && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleSave} loading={saving} className="flex-1">Save Draft</Button>
            <Button onClick={handleSend} loading={sending} className="flex-1">Send Quote</Button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
