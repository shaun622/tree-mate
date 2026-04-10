import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { reverseGeocode, searchAddresses } from '../../lib/geocode'
import Button from './Button'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = MAPBOX_TOKEN
  ? '&copy; Mapbox &copy; OpenStreetMap'
  : '&copy; OpenStreetMap'

const pinIcon = L.divIcon({
  className: 'pin-icon',
  html: `<div style="position:relative;width:32px;height:42px;">
    <svg viewBox="0 0 32 42" width="32" height="42" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#22c55e"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
})

function ClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
  })
  return null
}

function Recenter({ center }) {
  const map = useMap()
  useEffect(() => { if (center) map.setView(center, 16) }, [center, map])
  return null
}

export default function MapPinPicker({ initialLabel = '', onClose, onConfirm }) {
  const [marker, setMarker] = useState(null) // { lat, lng }
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [center, setCenter] = useState(null) // start from initial label if possible
  const [searching, setSearching] = useState(false)

  // Try to seed with the typed text so the map opens near it
  useEffect(() => {
    if (!initialLabel || initialLabel.trim().length < 3) {
      setCenter([-33.8688, 151.2093]) // Sydney default
      return
    }
    setSearching(true)
    searchAddresses(initialLabel, { limit: 1 }).then(r => {
      if (r?.[0]) {
        setCenter([r[0].lat, r[0].lng])
        setMarker({ lat: r[0].lat, lng: r[0].lng })
        setLabel(r[0].label)
      } else {
        setCenter([-33.8688, 151.2093])
      }
      setSearching(false)
    })
  }, [initialLabel])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleMapClick = async (latlng) => {
    setMarker({ lat: latlng.lat, lng: latlng.lng })
    setBusy(true)
    const r = await reverseGeocode(latlng.lat, latlng.lng)
    if (r) setLabel(r.label)
    else setLabel(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`)
    setBusy(false)
  }

  const handleConfirm = () => {
    if (!marker) return
    onConfirm({ label: label || `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}`, lat: marker.lat, lng: marker.lng })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-elevated overflow-hidden animate-slide-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pin location on map</h2>
            <p className="text-xs text-gray-500">Tap anywhere on the map to drop a pin</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative" style={{ height: 380 }}>
          {center ? (
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution={TILE_ATTRIBUTION}
                url={TILE_URL}
                {...(MAPBOX_TOKEN ? { tileSize: 512, zoomOffset: -1 } : {})}
              />
              <Recenter center={center} />
              <ClickHandler onClick={handleMapClick} />
              {marker && <Marker position={[marker.lat, marker.lng]} icon={pinIcon} />}
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {searching && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-gray-600 shadow-card">
              Locating...
            </div>
          )}
        </div>

        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Address label</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Pick a point on the map..."
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-tree-400 focus:outline-none focus:ring-4 focus:ring-tree-50 bg-gray-50/50 focus:bg-white text-sm"
            />
            {busy && <p className="text-[10px] text-gray-400 mt-1">Looking up address...</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={!marker} className="flex-1">Use this location</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
