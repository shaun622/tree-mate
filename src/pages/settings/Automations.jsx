import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'

const TRIGGERS = [
  { value: 'job_scheduled', label: 'Job Scheduled' },
  { value: 'job_started', label: 'Job Started' },
  { value: 'job_completed', label: 'Job Completed' },
  { value: 'report_completed', label: 'Report Completed' },
  { value: 'quote_sent', label: 'Quote Sent' },
  { value: 'quote_accepted', label: 'Quote Accepted' },
]

export default function Automations() {
  const { business } = useBusiness()
  const [rules, setRules] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', trigger_event: 'job_completed', action: 'send_email', template_id: '', active: true })

  useEffect(() => {
    if (!business?.id) return
    Promise.all([
      supabase.from('automation_rules').select('*').eq('business_id', business.id),
      supabase.from('communication_templates').select('id, name').eq('business_id', business.id),
    ]).then(([rulesRes, templatesRes]) => {
      setRules(rulesRes.data || [])
      setTemplates(templatesRes.data || [])
      setLoading(false)
    })
  }, [business?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('automation_rules').insert({ ...form, business_id: business.id }).select().single()
    if (data) setRules(prev => [...prev, data])
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', trigger_event: 'job_completed', action: 'send_email', template_id: '', active: true })
  }

  const toggleActive = async (id, active) => {
    const { data } = await supabase.from('automation_rules').update({ active }).eq('id', id).select().single()
    if (data) setRules(prev => prev.map(r => r.id === id ? data : r))
  }

  const handleDelete = async (id) => {
    await supabase.from('automation_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  return (
    <PageWrapper>
      <Header title="Automations" back="/settings" rightAction={
        <button onClick={() => setShowModal(true)} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4">
        {rules.length === 0 ? (
          <EmptyState title="No automations" description="Set up automated actions triggered by events" actionLabel="Add Automation" onAction={() => setShowModal(true)} />
        ) : (
          <div className="space-y-2">
            {rules.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{r.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="info">{r.trigger_event?.replace(/_/g, ' ')}</Badge>
                      <Badge variant="neutral">{r.action?.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(r.id, !r.active)} className={`relative w-11 h-6 rounded-full transition-colors ${r.active ? 'bg-tree-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${r.active ? 'translate-x-5' : ''}`} />
                    </button>
                    <button onClick={() => { if (confirm('Delete?')) handleDelete(r.id) }} className="p-1 hover:bg-red-50 rounded-full">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Automation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Select label="Trigger Event" value={form.trigger_event} onChange={e => setForm(p => ({ ...p, trigger_event: e.target.value }))} options={TRIGGERS} />
          <Select label="Template" value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))} options={[{ value: '', label: 'Select template...' }, ...templates.map(t => ({ value: t.id, label: t.name }))]} />
          <Button type="submit" loading={saving} className="w-full">Add Automation</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
