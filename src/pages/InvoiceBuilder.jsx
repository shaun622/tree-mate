import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input, TextArea, Select } from '../components/ui/Input'
import { calculateGST, formatCurrency } from '../lib/utils'

export default function InvoiceBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business, updateBusiness } = useBusiness()
  const { clients } = useClients(business?.id)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', invoice_number: '', due_date: '', notes: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
  })

  useEffect(() => {
    if (id) {
      supabase.from('invoices').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm({
          client_id: data.client_id || '', invoice_number: data.invoice_number || '',
          due_date: data.due_date || '', notes: data.notes || '',
          line_items: data.line_items || [{ description: '', quantity: 1, unit_price: 0 }],
        })
      })
    } else if (business) {
      const num = `${business.invoice_prefix || 'INV'}-${String(business.next_invoice_number || 1).padStart(4, '0')}`
      const due = new Date()
      due.setDate(due.getDate() + (business.default_payment_terms_days || 14))
      setForm(p => ({ ...p, invoice_number: num, due_date: due.toISOString().split('T')[0] }))
    }
  }, [id, business])

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

  const handleSave = async (status = 'draft') => {
    setSaving(true)
    const payload = {
      business_id: business.id, client_id: form.client_id || null,
      invoice_number: form.invoice_number, due_date: form.due_date || null,
      notes: form.notes, line_items: form.line_items, subtotal, gst, total, status,
    }
    if (id) {
      await supabase.from('invoices').update(payload).eq('id', id)
    } else {
      await supabase.from('invoices').insert(payload)
      // Increment invoice number
      await updateBusiness({ next_invoice_number: (business.next_invoice_number || 1) + 1 })
    }
    setSaving(false)
    navigate('/invoices')
  }

  return (
    <PageWrapper>
      <Header title={id ? 'Edit Invoice' : 'New Invoice'} back="/invoices" />

      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-3">
          <Input label="Invoice Number" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
          <Select label="Client" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} options={[{ value: '', label: 'Select client...' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
          {form.line_items.map((item, i) => (
            <div key={i} className="space-y-2 mb-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
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
          <button onClick={addItem} className="w-full py-2 text-sm text-tree-600 font-medium hover:bg-tree-50 rounded-lg">+ Add Line Item</button>

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">GST (10%)</span><span>{formatCurrency(gst)}</span></div>
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </Card>

        {business?.bank_details && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Bank Details</h3>
            <p className="text-sm text-gray-600">BSB: {business.bank_details.bsb}</p>
            <p className="text-sm text-gray-600">Account: {business.bank_details.account_number}</p>
            <p className="text-sm text-gray-600">Name: {business.bank_details.account_name}</p>
          </Card>
        )}

        <TextArea label="Notes" placeholder="Additional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => handleSave('draft')} loading={saving} className="flex-1">Save Draft</Button>
          <Button onClick={() => handleSave('sent')} loading={saving} className="flex-1">Send Invoice</Button>
        </div>
      </div>
    </PageWrapper>
  )
}
