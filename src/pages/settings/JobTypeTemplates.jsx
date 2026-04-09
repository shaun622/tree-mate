import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, TextArea } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { SUGGESTED_JOB_TYPES } from '../../lib/utils'

export default function JobTypeTemplates() {
  const { business } = useBusiness()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#22c55e', default_tasks: '', estimated_duration_minutes: '', price: '' })

  useEffect(() => {
    if (!business?.id) return
    supabase.from('job_type_templates').select('*').eq('business_id', business.id).order('name')
      .then(({ data }) => { setTemplates(data || []); setLoading(false) })
  }, [business?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      default_tasks: form.default_tasks.split('\n').filter(t => t.trim()),
      estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
      price: form.price ? Number(form.price) : null,
    }
    if (editing) {
      const { data } = await supabase.from('job_type_templates').update(payload).eq('id', editing.id).select().single()
      if (data) setTemplates(prev => prev.map(t => t.id === editing.id ? data : t))
    } else {
      const { data } = await supabase.from('job_type_templates').insert({ ...payload, business_id: business.id }).select().single()
      if (data) setTemplates(prev => [...prev, data])
    }
    setSaving(false)
    setShowModal(false)
    setEditing(null)
  }

  const handleAddSuggestion = async (suggestion) => {
    const exists = templates.find(t => t.name === suggestion.name)
    if (exists) return
    const { data } = await supabase.from('job_type_templates').insert({
      business_id: business.id, name: suggestion.name, description: suggestion.description,
      color: suggestion.color, default_tasks: suggestion.default_tasks,
      estimated_duration_minutes: suggestion.estimated_duration_minutes,
    }).select().single()
    if (data) setTemplates(prev => [...prev, data])
  }

  const handleDelete = async (id) => {
    await supabase.from('job_type_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const existingNames = new Set(templates.map(t => t.name))

  return (
    <PageWrapper>
      <Header title="Job Types" back="/settings" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '', color: '#22c55e', default_tasks: '', estimated_duration_minutes: '', price: '' }); setShowModal(true) }} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Suggested Job Types</h3>
          <button onClick={() => setShowSuggestions(!showSuggestions)} className="text-xs text-tree-600 font-medium">
            {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
          </button>
        </div>

        {showSuggestions && (
          <div className="space-y-2">
            {SUGGESTED_JOB_TYPES.filter(s => !existingNames.has(s.name)).map(s => (
              <Card key={s.name} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.estimated_duration_minutes}min • {s.default_tasks.length} tasks</p>
                  </div>
                </div>
                <button onClick={() => handleAddSuggestion(s)} className="px-3 py-1.5 bg-tree-50 text-tree-700 rounded-lg text-xs font-medium hover:bg-tree-100">Add</button>
              </Card>
            ))}
          </div>
        )}

        <h3 className="text-sm font-semibold text-gray-900">Your Job Types ({templates.length})</h3>
        {templates.length === 0 ? (
          <EmptyState title="No job types" description="Add from suggestions or create your own" />
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.estimated_duration_minutes}min{t.price ? ` • $${t.price}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(t); setForm({ name: t.name, description: t.description || '', color: t.color || '#22c55e', default_tasks: (t.default_tasks || []).join('\n'), estimated_duration_minutes: t.estimated_duration_minutes || '', price: t.price || '' }); setShowModal(true) }} className="p-2 hover:bg-gray-100 rounded-full">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => { if (confirm('Delete?')) handleDelete(t.id) }} className="p-2 hover:bg-red-50 rounded-full">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Job Type' : 'Add Job Type'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer" />
          </div>
          <TextArea label="Default Tasks (one per line)" value={form.default_tasks} onChange={e => setForm(p => ({ ...p, default_tasks: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (min)" type="number" value={form.estimated_duration_minutes} onChange={e => setForm(p => ({ ...p, estimated_duration_minutes: e.target.value }))} />
            <Input label="Price ($)" type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
          </div>
          <Button type="submit" loading={saving} className="w-full">{editing ? 'Save' : 'Add Job Type'}</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
