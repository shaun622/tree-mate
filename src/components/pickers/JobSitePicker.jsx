import { useState } from 'react'
import { Select, TextArea } from '../ui/Input'
import AddressAutocomplete from '../ui/AddressAutocomplete'
import Button from '../ui/Button'

export default function JobSitePicker({ sites, client, clientId, value, onChange, onCreate, onUpdate, label = 'Job Site', required = false }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'new' | 'edit'
  const [newForm, setNewForm] = useState({ address: '', notes: '', lat: null, lng: null })
  const [editForm, setEditForm] = useState({ address: '', notes: '', lat: null, lng: null })
  const [useClientAddr, setUseClientAddr] = useState(false)
  const [busy, setBusy] = useState(false)

  const clientAddress = client?.address || ''
  const hasClientAddress = clientAddress.trim().length > 0

  const toggleUseClientAddr = (checked) => {
    setUseClientAddr(checked)
    if (checked && hasClientAddress) {
      setNewForm(p => ({
        ...p,
        address: clientAddress,
        lat: client?.lat ?? null,
        lng: client?.lng ?? null,
      }))
    }
  }

  const selected = sites.find(s => s.id === value)
  const disabled = !clientId

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
    if (!newForm.address.trim() || !clientId) return
    setBusy(true)
    const { data, error } = await onCreate({ ...newForm, client_id: clientId })
    if (!error && data) {
      onChange(data.id)
      setMode('idle')
      setNewForm({ address: '', notes: '', lat: null, lng: null })
      setUseClientAddr(false)
    }
    setBusy(false)
  }

  const startEdit = () => {
    if (!selected) return
    setEditForm({
      address: selected.address || '',
      notes: selected.notes || '',
      lat: selected.lat ?? null,
      lng: selected.lng ?? null,
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
        disabled={disabled}
        options={[
          { value: '', label: disabled ? 'Select a client first' : 'Select site...' },
          ...(disabled ? [] : [{ value: '__new__', label: '+ New Site' }]),
          ...sites.map(s => ({ value: s.id, label: s.address })),
        ]}
      />

      {mode === 'new' && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Add Site</p>
          {hasClientAddress && (
            <label className="flex items-center gap-2 px-3 py-2 bg-tree-50 border border-tree-200 rounded-xl cursor-pointer hover:bg-tree-100 transition-colors">
              <input
                type="checkbox"
                checked={useClientAddr}
                onChange={e => toggleUseClientAddr(e.target.checked)}
                className="w-4 h-4 rounded border-tree-300 text-tree-600 focus:ring-tree-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-tree-700">Use customer's address</p>
                <p className="text-[11px] text-tree-600/70 truncate">{clientAddress}</p>
              </div>
            </label>
          )}
          <AddressAutocomplete
            value={newForm.address}
            onChange={(addr, coords) => {
              setNewForm(p => ({ ...p, address: addr, lat: coords?.lat ?? null, lng: coords?.lng ?? null }))
              if (useClientAddr) setUseClientAddr(false)
            }}
            placeholder="Start typing site address..."
          />
          <TextArea placeholder="Notes (optional)" value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode('idle')} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" onClick={handleCreate} loading={busy} className="flex-1 !min-h-[40px] text-xs">Add Site</Button>
          </div>
        </div>
      )}

      {mode === 'edit' && selected && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Site</p>
          <AddressAutocomplete
            value={editForm.address}
            onChange={(addr, coords) => setEditForm(p => ({ ...p, address: addr, lat: coords?.lat ?? p.lat, lng: coords?.lng ?? p.lng }))}
            placeholder="Start typing site address..."
          />
          <TextArea placeholder="Notes (optional)" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode('idle')} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" loading={busy} onClick={handleSaveEdit} className="flex-1 !min-h-[40px] text-xs">Save</Button>
          </div>
        </div>
      )}

      {mode === 'idle' && selected && (
        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-tree-50 text-tree-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="text-sm space-y-0.5 min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{selected.address}</p>
            {selected.notes && <p className="text-gray-500 text-xs truncate">{selected.notes}</p>}
          </div>
          <button type="button" onClick={startEdit} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0" aria-label="Edit site">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
