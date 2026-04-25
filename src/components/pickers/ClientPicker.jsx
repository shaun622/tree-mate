import { useState } from 'react'
import { Input, Select } from '../ui/Input'
import AddressAutocomplete from '../ui/AddressAutocomplete'
import Button from '../ui/Button'

export default function ClientPicker({ clients, value, onChange, onCreate, onUpdate, label = 'Client', required = false }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'new' | 'edit'
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [busy, setBusy] = useState(false)

  const selected = clients.find(c => c.id === value)

  const handleSelect = (val) => {
    if (val === '__new__') {
      setMode('new')
      onChange('')
    } else {
      setMode('idle')
      onChange(val)
    }
  }

  const handleCreate = async () => {
    if (!newForm.name.trim()) return
    setBusy(true)
    const { data, error } = await onCreate(newForm)
    if (!error && data) {
      onChange(data.id)
      setMode('idle')
      setNewForm({ name: '', email: '', phone: '', address: '' })
    }
    setBusy(false)
  }

  const startEdit = () => {
    if (!selected) return
    setEditForm({
      name: selected.name || '',
      email: selected.email || '',
      phone: selected.phone || '',
      address: selected.address || '',
    })
    setMode('edit')
  }

  const handleSaveEdit = async () => {
    setBusy(true)
    await onUpdate(selected.id, editForm)
    setMode('idle')
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <Select
        label={label}
        value={value}
        onChange={e => handleSelect(e.target.value)}
        required={required}
        options={[
          { value: '', label: 'Select client...' },
          { value: '__new__', label: '+ New Client' },
          ...clients.map(c => ({ value: c.id, label: c.name })),
        ]}
      />

      {mode === 'new' && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Quick Add Client</p>
          <Input placeholder="Client name" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
          <div className="flex gap-2">
            <Input placeholder="Email" type="email" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} className="flex-1" />
            <Input placeholder="Phone" type="tel" value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))} className="flex-1" />
          </div>
          <AddressAutocomplete
            value={newForm.address}
            onChange={(addr) => setNewForm(p => ({ ...p, address: addr }))}
            placeholder="Address (optional)"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode('idle')} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" onClick={handleCreate} loading={busy} className="flex-1 !min-h-[40px] text-xs">Add Client</Button>
          </div>
        </div>
      )}

      {mode === 'edit' && selected && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Edit Client</p>
          <Input placeholder="Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
          <div className="flex gap-2">
            <Input placeholder="Email" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="flex-1" />
            <Input placeholder="Phone" type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="flex-1" />
          </div>
          <AddressAutocomplete
            value={editForm.address}
            onChange={(addr) => setEditForm(p => ({ ...p, address: addr }))}
            placeholder="Address"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode('idle')} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" loading={busy} onClick={handleSaveEdit} className="flex-1 !min-h-[40px] text-xs">Save</Button>
          </div>
        </div>
      )}

      {mode === 'idle' && selected && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
            {selected.name?.charAt(0)}
          </div>
          <div className="text-sm space-y-0.5 min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{selected.name}</p>
            {selected.email && <p className="text-gray-500 dark:text-gray-500 truncate">{selected.email}</p>}
            {selected.phone && <p className="text-gray-500 dark:text-gray-500">{selected.phone}</p>}
            {selected.address && <p className="text-gray-400 dark:text-gray-500 truncate">{selected.address}</p>}
          </div>
          <button type="button" onClick={startEdit} className="p-1.5 rounded-lg hover:bg-gray-200 dark:bg-gray-800 transition-colors flex-shrink-0" aria-label="Edit client">
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
