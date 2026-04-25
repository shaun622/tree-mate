import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { Input, Select, TextArea } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { SUGGESTED_EQUIPMENT, EQUIPMENT_CATEGORIES, CATEGORY_COLORS, formatCurrency } from '../../lib/utils'

export default function EquipmentLibrary() {
  const { business } = useBusiness()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [form, setForm] = useState({ name: '', category: 'cutting', hourly_rate: '', notes: '' })
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!business?.id) return
    supabase.from('equipment_library').select('*').eq('business_id', business.id).order('name')
      .then(({ data }) => { setEquipment(data || []); setLoading(false) })
  }, [business?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('equipment_library').update(form).eq('id', editing.id).select().single()
      if (data) setEquipment(prev => prev.map(e => e.id === editing.id ? data : e))
    } else {
      const { data } = await supabase.from('equipment_library').insert({ ...form, business_id: business.id }).select().single()
      if (data) setEquipment(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setSaving(false)
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', category: 'cutting', hourly_rate: '', notes: '' })
  }

  const handleAddSuggestion = async (suggestion) => {
    const exists = equipment.find(e => e.name === suggestion.name)
    if (exists) return
    const { data } = await supabase.from('equipment_library').insert({ ...suggestion, business_id: business.id }).select().single()
    if (data) setEquipment(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleDelete = async (id) => {
    await supabase.from('equipment_library').delete().eq('id', id)
    setEquipment(prev => prev.filter(e => e.id !== id))
  }

  const filtered = filterCat ? equipment.filter(e => e.category === filterCat) : equipment
  const existingNames = new Set(equipment.map(e => e.name))

  return (
    <PageWrapper>
      <Header title="Equipment Library" back="/settings" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: '', category: 'cutting', hourly_rate: '', notes: '' }); setShowModal(true) }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full">
          <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        {/* Suggestions */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Suggested Equipment</h3>
          <button onClick={() => setShowSuggestions(!showSuggestions)} className="text-xs text-brand-600 font-medium">
            {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
          </button>
        </div>
        {showSuggestions && (
          <div className="grid grid-cols-1 gap-2">
            {SUGGESTED_EQUIPMENT.filter(s => !existingNames.has(s.name)).map(s => (
              <Card key={s.name} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="neutral">{s.category}</Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-500">${s.hourly_rate}/hr</span>
                  </div>
                </div>
                <button onClick={() => handleAddSuggestion(s)} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100">Add</button>
              </Card>
            ))}
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${!filterCat ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-500'}`}>All</button>
          {EQUIPMENT_CATEGORIES.filter(c => c.value).map(c => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filterCat === c.value ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-500'}`}>{c.label}</button>
          ))}
        </div>

        {/* Equipment List */}
        {filtered.length === 0 ? (
          <EmptyState title="No equipment" description="Add equipment from suggestions or create your own" />
        ) : (
          <div className="space-y-2">
            {filtered.map(eq => (
              <Card key={eq.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{eq.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[eq.category] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{eq.category}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-500">${eq.hourly_rate}/hr</span>
                    </div>
                    {eq.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{eq.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(eq); setForm({ name: eq.name, category: eq.category, hourly_rate: eq.hourly_rate || '', notes: eq.notes || '' }); setShowModal(true) }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(eq.id)} className="p-2 hover:bg-red-50 rounded-full">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Equipment' : 'Add Equipment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={EQUIPMENT_CATEGORIES} />
          <Input label="Hourly Rate ($)" type="number" min="0" step="0.01" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} />
          <TextArea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">{editing ? 'Save Changes' : 'Add Equipment'}</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this equipment?"
        description="It will be removed from your library."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => { await handleDelete(deleteId) }}
      />
    </PageWrapper>
  )
}
