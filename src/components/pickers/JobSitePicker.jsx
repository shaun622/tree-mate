import { useState, useEffect } from 'react'
import { TextArea } from '../ui/Input'
import AddressAutocomplete from '../ui/AddressAutocomplete'
import Button from '../ui/Button'

export default function JobSitePicker({ sites, client, clientId, value, onChange, onCreate, onUpdate, label = 'Job Site', required = false }) {
  const [busy, setBusy] = useState(false)
  const [useClientAddr, setUseClientAddr] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ address: '', notes: '', lat: null, lng: null })

  const selected = sites.find(s => s.id === value)
  const disabled = !clientId
  const clientAddress = client?.address || ''
  const hasClientAddress = clientAddress.trim().length > 0

  // Reset local state when client changes
  useEffect(() => {
    setUseClientAddr(false)
    setEditing(false)
    setDraft({ address: '', notes: '', lat: null, lng: null })
  }, [clientId])

  // Keep draft in sync when editing an existing site
  useEffect(() => {
    if (editing && selected) {
      setDraft({
        address: selected.address || '',
        notes: selected.notes || '',
        lat: selected.lat ?? null,
        lng: selected.lng ?? null,
      })
    }
  }, [editing, selected])

  const createSite = async (payload) => {
    if (!payload.address?.trim() || !clientId) return
    setBusy(true)
    const { data, error } = await onCreate({ ...payload, client_id: clientId })
    if (!error && data) onChange(data.id)
    setBusy(false)
  }

  const toggleUseClientAddr = async (checked) => {
    setUseClientAddr(checked)
    if (checked && hasClientAddress) {
      await createSite({
        address: clientAddress,
        notes: '',
        lat: client?.lat ?? null,
        lng: client?.lng ?? null,
      })
    }
  }

  const handleAddressPick = async (addr, coords) => {
    if (coords) {
      // User picked from autocomplete — auto-create site
      await createSite({ address: addr, notes: '', lat: coords.lat, lng: coords.lng })
    }
  }

  const handleSaveEdit = async () => {
    setBusy(true)
    await onUpdate(selected.id, draft)
    setEditing(false)
    setBusy(false)
  }

  const clearSite = () => {
    onChange('')
    setUseClientAddr(false)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>

      {/* Use customer's address toggle */}
      {!selected && !disabled && hasClientAddress && (
        <button
          type="button"
          onClick={() => toggleUseClientAddr(!useClientAddr)}
          disabled={busy}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left disabled:opacity-60 transition-colors duration-150 ${
            useClientAddr
              ? 'bg-tree-600 border-tree-600'
              : 'bg-white border-gray-200 hover:border-tree-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
            useClientAddr ? 'bg-white/15 text-white' : 'bg-tree-50 text-tree-600'
          }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold transition-colors duration-150 ${useClientAddr ? 'text-white' : 'text-gray-900'}`}>
              Use customer's address
            </p>
            <p className={`text-xs truncate transition-colors duration-150 ${useClientAddr ? 'text-white/80' : 'text-gray-500'}`}>
              {clientAddress}
            </p>
          </div>
          {/* iOS-style toggle switch */}
          <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-150 ${
            useClientAddr ? 'bg-white/25' : 'bg-gray-200'
          }`}>
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-out"
              style={{ transform: useClientAddr ? 'translateX(22px)' : 'translateX(2px)' }}
            />
          </div>
        </button>
      )}

      {/* OR divider */}
      {!selected && !disabled && hasClientAddress && !useClientAddr && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">or enter manually</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
      )}

      {/* Address input (hidden when a site is picked) */}
      {!selected && (
        <AddressAutocomplete
          value={draft.address}
          onChange={(addr, coords) => {
            setDraft(p => ({ ...p, address: addr, lat: coords?.lat ?? null, lng: coords?.lng ?? null }))
            if (coords) handleAddressPick(addr, coords)
          }}
          placeholder={disabled ? 'Select a client first' : 'Start typing site address...'}
        />
      )}

      {/* Selected site card */}
      {selected && !editing && (
        <div className="bg-gradient-to-br from-tree-50 to-white border-2 border-tree-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tree-500 to-tree-600 text-white flex items-center justify-center flex-shrink-0 shadow-button">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="text-sm min-w-0 flex-1 pt-0.5">
            <p className="font-semibold text-gray-900 leading-snug">{selected.address}</p>
            {selected.notes && <p className="text-gray-500 text-xs mt-1 truncate">{selected.notes}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => setEditing(true)} className="p-2 rounded-xl hover:bg-tree-100 transition-colors" aria-label="Edit site">
              <svg className="w-4 h-4 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button type="button" onClick={clearSite} className="p-2 rounded-xl hover:bg-red-50 transition-colors" aria-label="Change site">
              <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Edit existing site */}
      {selected && editing && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Site</p>
          <AddressAutocomplete
            value={draft.address}
            onChange={(addr, coords) => setDraft(p => ({ ...p, address: addr, lat: coords?.lat ?? p.lat, lng: coords?.lng ?? p.lng }))}
            placeholder="Start typing site address..."
          />
          <TextArea placeholder="Notes (optional)" value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} rows={2} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" loading={busy} onClick={handleSaveEdit} className="flex-1 !min-h-[40px] text-xs">Save</Button>
          </div>
        </div>
      )}

      {busy && !selected && <p className="text-xs text-gray-400">Adding site...</p>}
    </div>
  )
}
