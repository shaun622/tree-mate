import { useState } from 'react'
import { Input, Select } from '../ui/Input'
import AddressAutocomplete from '../ui/AddressAutocomplete'
import Button from '../ui/Button'
import NewClientModal from '../ui/NewClientModal'

/**
 * ClientPicker — dropdown with inline edit + nested "New client" modal.
 *
 * Note on `onCreate`: legacy callers pass `onCreate={createClient}` from
 * useClients. We intentionally ignore that prop now — `NewClientModal`
 * does its own insert via supabase, with email/phone duplicate detection
 * baked in. Edit mode still uses the parent's `onUpdate(id, values)`.
 */
export default function ClientPicker({ clients, value, onChange, onUpdate, label = 'Client', required = false }) {
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  // Clients created via NewClientModal that haven't yet been refetched
  // into the parent's `clients` prop. Keeps the dropdown UX consistent
  // until the parent refreshes useClients on next nav.
  const [extraClients, setExtraClients] = useState([])

  const allClients = [...clients, ...extraClients.filter(ec => !clients.some(c => c.id === ec.id))]
  const selected = allClients.find(c => c.id === value)

  const handleSelect = (val) => {
    if (val === '__new__') {
      setShowNewModal(true)
      onChange('')
    } else {
      setEditing(false)
      onChange(val)
    }
  }

  const handleNewClientCreated = (client) => {
    setExtraClients(prev => [...prev.filter(c => c.id !== client.id), client])
    onChange(client.id)
    setShowNewModal(false)
  }

  const startEdit = () => {
    if (!selected) return
    setEditForm({
      name: selected.name || '',
      email: selected.email || '',
      phone: selected.phone || '',
      address: selected.address || '',
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    setBusy(true)
    await onUpdate(selected.id, editForm)
    setEditing(false)
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
          ...allClients.map(c => ({ value: c.id, label: c.name })),
        ]}
      />

      {editing && selected && (
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
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" loading={busy} onClick={handleSaveEdit} className="flex-1 !min-h-[40px] text-xs">Save</Button>
          </div>
        </div>
      )}

      {!editing && selected && (
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

      <NewClientModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleNewClientCreated}
        zLayer={70}
      />
    </div>
  )
}
