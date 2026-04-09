import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, TextArea, Select } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { TEMPLATE_VARIABLES } from '../../lib/templateEngine'

const TRIGGER_TYPES = [
  { value: 'job_scheduled', label: 'Job Scheduled' },
  { value: 'job_started', label: 'Job Started' },
  { value: 'job_completed', label: 'Job Completed' },
  { value: 'report_completed', label: 'Report Completed' },
  { value: 'quote_sent', label: 'Quote Sent' },
  { value: 'quote_accepted', label: 'Quote Accepted' },
]

export default function CommunicationTemplates() {
  const { business } = useBusiness()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'email', trigger_type: 'job_completed', subject: '', body: '' })

  useEffect(() => {
    if (!business?.id) return
    supabase.from('communication_templates').select('*').eq('business_id', business.id).order('name')
      .then(({ data }) => { setTemplates(data || []); setLoading(false) })
  }, [business?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('communication_templates').update(form).eq('id', editing.id).select().single()
      if (data) setTemplates(prev => prev.map(t => t.id === editing.id ? data : t))
    } else {
      const { data } = await supabase.from('communication_templates').insert({ ...form, business_id: business.id }).select().single()
      if (data) setTemplates(prev => [...prev, data])
    }
    setSaving(false)
    setShowModal(false)
    setEditing(null)
  }

  const insertVariable = (key) => {
    setForm(p => ({ ...p, body: p.body + `{${key}}` }))
  }

  return (
    <PageWrapper>
      <Header title="Templates" back="/settings" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: '', type: 'email', trigger_type: 'job_completed', subject: '', body: '' }); setShowModal(true) }} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4">
        {templates.length === 0 ? (
          <EmptyState title="No templates" description="Create email/SMS templates for automated communications" actionLabel="Add Template" onAction={() => setShowModal(true)} />
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <Card key={t.id} hover onClick={() => { setEditing(t); setForm(t); setShowModal(true) }} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={t.type === 'email' ? 'info' : 'warning'}>{t.type}</Badge>
                    <Badge variant="neutral">{t.trigger_type?.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Template' : 'Add Template'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Template Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} />
            <Select label="Trigger" value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))} options={TRIGGER_TYPES} />
          </div>
          {form.type === 'email' && (
            <Input label="Subject" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
          )}
          <TextArea label="Body" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Insert Variable:</p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARIABLES.map(v => (
                <button key={v.key} type="button" onClick={() => insertVariable(v.key)} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200" title={v.description}>
                  {`{${v.key}}`}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" loading={saving} className="w-full">{editing ? 'Save' : 'Add Template'}</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
