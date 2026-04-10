import { useState, useRef, useEffect } from 'react'
import { searchAddresses, placeDetails } from '../../lib/geocode'
import MapPinPicker from './MapPinPicker'

export default function AddressAutocomplete({ value, onChange, label, placeholder = 'Start typing an address...', className = '' }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)

  // Sync external value
  useEffect(() => { setQuery(value || '') }, [value])

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (e) => {
    const v = e.target.value
    setQuery(v)
    onChange(v, null) // text change with no coords yet
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const r = await searchAddresses(v)
      setResults(r)
      setOpen(true)
      setLoading(false)
    }, 450)
  }

  const handlePick = async (r) => {
    setQuery(r.label)
    setOpen(false)
    // Google Places predictions don't include coords — fetch details
    if (r.placeId && (r.lat == null || r.lng == null)) {
      setLoading(true)
      const details = await placeDetails(r.placeId)
      setLoading(false)
      if (details) {
        setQuery(details.label || r.label)
        onChange(details.label || r.label, { lat: details.lat, lng: details.lng })
        return
      }
    }
    onChange(r.label, { lat: r.lat, lng: r.lng })
  }

  const handleMapPick = (r) => {
    setShowMap(false)
    if (r) {
      setQuery(r.label)
      onChange(r.label, { lat: r.lat, lng: r.lng })
    }
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
      <div ref={wrapRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-100 focus:border-tree-400 focus:outline-none focus:ring-4 focus:ring-tree-50 bg-gray-50/50 focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-tree-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {open && results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-elevated border border-gray-100 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePick(r)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-tree-50 hover:text-tree-700 border-b border-gray-50 last:border-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="line-clamp-2">{r.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {open && !loading && results.length === 0 && query.trim().length >= 3 && (
          <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-elevated border border-gray-100 px-4 py-3 text-sm text-gray-500">
            No matches found. Try the map picker below.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowMap(true)}
        className="mt-1.5 text-xs font-semibold text-tree-600 hover:text-tree-700 flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        Pin on map instead
      </button>

      {showMap && (
        <MapPinPicker
          initialLabel={query}
          onClose={() => setShowMap(false)}
          onConfirm={handleMapPick}
        />
      )}
    </div>
  )
}
