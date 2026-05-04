import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input, TextArea } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ClientPicker from '../components/pickers/ClientPicker'
import AddressAutocomplete from '../components/ui/AddressAutocomplete'
import { calculateGST, formatCurrency } from '../lib/utils'

export default function InvoiceBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('job_id')
  const { business, updateBusiness } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const [saving, setSaving] = useState(false)
  const [linkedJobId, setLinkedJobId] = useState(jobId || null)
  const [showEditClient, setShowEditClient] = useState(false)
  const [editClientForm, setEditClientForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [form, setForm] = useState({
    client_id: '', invoice_number: '', due_date: '', notes: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
  })
  // Per-doc gst_rate. Null on legacy invoices that predate the column —
  // those fall back to business.gst_rate, then to 0.10 hardcoded
  // default. New invoices freeze the business rate at save time.
  const [docGstRate, setDocGstRate] = useState(null)

  // Load existing invoice for editing
  useEffect(() => {
    if (id) {
      supabase.from('invoices').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setForm({
            client_id: data.client_id || '', invoice_number: data.invoice_number || '',
            due_date: data.due_date || '', notes: data.notes || '',
            line_items: data.line_items || [{ description: '', quantity: 1, unit_price: 0 }],
          })
          setDocGstRate(data.gst_rate != null ? Number(data.gst_rate) : null)
          if (data.job_id) setLinkedJobId(data.job_id)
        }
      })
    } else if (business) {
      const num = `${business.invoice_prefix || 'INV'}-${String(business.next_invoice_number || 1).padStart(4, '0')}`
      const due = new Date()
      due.setDate(due.getDate() + (business.default_payment_terms_days || 14))
      setForm(p => ({ ...p, invoice_number: num, due_date: due.toISOString().split('T')[0] }))
    }
  }, [id, business])

  // Pre-fill from linked job and its quote
  useEffect(() => {
    if (!jobId || id) return
    const prefill = async () => {
      const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single()
      if (!job) return
      let quote = null
      if (job.quote_id) {
        const { data } = await supabase.from('quotes').select('*').eq('id', job.quote_id).single()
        quote = data
      }
      setForm(prev => ({
        ...prev,
        client_id: job.client_id || prev.client_id,
        line_items: quote?.line_items?.length ? quote.line_items : prev.line_items,
        notes: quote?.scope ? `Scope: ${quote.scope}` : prev.notes,
      }))
    }
    prefill()
  }, [jobId, id])

  const updateItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.line_items]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, line_items: items }
    })
  }

  const addItem = () => setForm(prev => ({ ...prev, line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0 }] }))
  const removeItem = (index) => setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) }))

  const selectedClient = useMemo(() => clients.find(c => c.id === form.client_id), [clients, form.client_id])

  const openEditClient = () => {
    if (selectedClient) {
      setEditClientForm({ name: selectedClient.name || '', email: selectedClient.email || '', phone: selectedClient.phone || '', address: selectedClient.address || '' })
      setShowEditClient(true)
    }
  }

  const handleSaveClient = async (e) => {
    e.preventDefault()
    if (!selectedClient) return
    await updateClient(selectedClient.id, editClientForm)
    setShowEditClient(false)
  }

  const subtotal = form.line_items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  // Effective rate: per-doc → business default → hardcoded 0.10.
  // When the business has GST disabled, force rate=0 on new invoices.
  const businessRate = business?.gst_enabled === false
    ? 0
    : (business?.gst_rate != null ? Number(business.gst_rate) : 0.10)
  const gstRate = docGstRate ?? businessRate
  const { gst, total } = calculateGST(subtotal, gstRate)

  const handleSave = async (status = 'draft') => {
    setSaving(true)
    const payload = {
      business_id: business.id, client_id: form.client_id || null,
      invoice_number: form.invoice_number, due_date: form.due_date || null,
      notes: form.notes, line_items: form.line_items, subtotal, gst, total,
      // Persist the rate alongside the amount so a future business-
      // level rate change doesn't retroactively relabel this invoice.
      gst_rate: gstRate,
      status: status === 'sent' ? 'draft' : status, // edge function sets 'sent'
      job_id: linkedJobId || null,
    }
    let invoiceId = id
    if (id) {
      await supabase.from('invoices').update(payload).eq('id', id)
    } else {
      const { data } = await supabase.from('invoices').insert(payload).select().single()
      invoiceId = data?.id
      // Increment invoice number
      await updateBusiness({ next_invoice_number: (business.next_invoice_number || 1) + 1 })
      // Link invoice back to job and update job status to 'invoiced'
      if (linkedJobId && data) {
        await supabase.from('jobs').update({ status: 'invoiced' }).eq('id', linkedJobId)
      }
    }
    // Send email via edge function
    if (status === 'sent' && invoiceId) {
      await supabase.functions.invoke('send-invoice', { body: { invoice_id: invoiceId } })
    }
    setSaving(false)
    navigate(linkedJobId ? `/jobs/${linkedJobId}` : '/invoices')
  }

  return (
    <PageWrapper>
      <Header title={id ? 'Edit Invoice' : 'New Invoice'} back={linkedJobId ? `/jobs/${linkedJobId}` : '/invoices'} />

      <div className="px-4 py-4 space-y-4">
        {/* Job link banner */}
        {linkedJobId && !id && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <p className="text-xs font-semibold text-brand-700">Linked to job — invoice will update the job pipeline</p>
          </div>
        )}

        {/* Client Details Card */}
        {selectedClient ? (
          <Card className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Bill To</h3>
              <button onClick={openEditClient} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-lg transition-colors" title="Edit client details">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedClient.name}</p>
            {selectedClient.phone && <p className="text-sm text-gray-600 dark:text-gray-500 mt-0.5">{selectedClient.phone}</p>}
            {selectedClient.email && <p className="text-sm text-gray-600 dark:text-gray-500 mt-0.5">{selectedClient.email}</p>}
            {selectedClient.address && <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">{selectedClient.address}</p>}
            {!selectedClient.phone && !selectedClient.email && !selectedClient.address && (
              <button onClick={openEditClient} className="text-xs text-brand-600 font-semibold mt-1 hover:text-brand-700">+ Add contact details</button>
            )}
          </Card>
        ) : (
          <Card className="p-4">
            <ClientPicker
              clients={clients}
              value={form.client_id}
              onChange={(cid) => setForm(p => ({ ...p, client_id: cid }))}
              onCreate={createClient}
              onUpdate={updateClient}
            />
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <Input label="Invoice Number" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Line Items</h3>
          {form.line_items.map((item, i) => (
            <div key={i} className="space-y-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 last:mb-0">
              <Input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              <div className="flex gap-2 items-end">
                <Input label="Qty" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-20" />
                <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="flex-1" />
                <p className="text-sm font-medium pb-3 w-24 text-right">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</p>
                {form.line_items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="pb-3 text-red-400 hover:text-red-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addItem} className="w-full py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg">+ Add Line Item</button>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {gstRate > 0 && (
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-500">GST ({+(gstRate * 100).toFixed(2)}%)</span><span>{formatCurrency(gst)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </Card>

        {business?.bank_details && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Bank Details</h3>
            <p className="text-sm text-gray-600 dark:text-gray-500">BSB: {business.bank_details.bsb}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">Account: {business.bank_details.account_number}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">Name: {business.bank_details.account_name}</p>
          </Card>
        )}

        <TextArea label="Notes" placeholder="Additional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => handleSave('draft')} loading={saving} className="flex-1">Save Draft</Button>
          <Button onClick={() => handleSave('sent')} loading={saving} className="flex-1">Send Invoice</Button>
        </div>
      </div>
      {/* Edit Client Modal */}
      <Modal open={showEditClient} onClose={() => setShowEditClient(false)} title="Edit Client Details">
        <form onSubmit={handleSaveClient} className="space-y-4">
          <Input label="Name" value={editClientForm.name} onChange={e => setEditClientForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Phone" type="tel" value={editClientForm.phone} onChange={e => setEditClientForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Email" type="email" value={editClientForm.email} onChange={e => setEditClientForm(p => ({ ...p, email: e.target.value }))} />
          <AddressAutocomplete label="Address" value={editClientForm.address} onChange={(addr) => setEditClientForm(p => ({ ...p, address: addr }))} />
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
