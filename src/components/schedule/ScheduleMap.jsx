import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const MAPBOX_STYLE = 'mapbox/streets-v12'
const TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; OpenStreetMap'

// Numbered green pin icon (matches the brand)
function makeNumberIcon(num, color = '#22c55e') {
  return L.divIcon({
    className: 'schedule-marker',
    html: `<div style="position:relative;width:32px;height:42px;">
      <svg viewBox="0 0 32 42" width="32" height="42" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="${color}"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <text x="16" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${color}">${num}</text>
      </svg>
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  })
}

function FitBounds({ points, routeGeometry }) {
  const map = useMap()
  useEffect(() => {
    const all = routeGeometry?.length ? routeGeometry : points.map(p => [p.lat, p.lng])
    if (all.length === 0) return
    if (all.length === 1) {
      map.setView(all[0], 13)
      return
    }
    const bounds = L.latLngBounds(all)
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [points, routeGeometry, map])
  return null
}

export default function ScheduleMap({ points = [], routeGeometry = null, onMarkerClick, height = 320 }) {
  const center = points[0] ? [points[0].lat, points[0].lng] : [-33.8688, 151.2093] // Sydney default
  const straightLine = points.map(p => [p.lat, p.lng])

  return (
    <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          {...(MAPBOX_TOKEN ? { tileSize: 512, zoomOffset: -1 } : {})}
        />
        {routeGeometry?.length > 1 ? (
          <Polyline positions={routeGeometry} pathOptions={{ color: '#22c55e', weight: 5, opacity: 0.85 }} />
        ) : straightLine.length > 1 ? (
          <Polyline positions={straightLine} pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.5, dashArray: '8, 8' }} />
        ) : null}
        {points.map((p, i) => (
          <Marker
            key={p.id || i}
            position={[p.lat, p.lng]}
            icon={makeNumberIcon(i + 1)}
          >
            <Popup className="schedule-popup" maxWidth={260} minWidth={220}>
              <div style={{ padding: '4px 2px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: '#22c55e', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111827' }}>
                    {p.label || `Stop ${i + 1}`}
                  </p>
                </div>
                {p.subtitle && (
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                    {p.subtitle}
                  </p>
                )}
                {p.time && (
                  <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {p.time}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onMarkerClick?.(p)}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'linear-gradient(135deg, #22c55e, #15803d)',
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)',
                  }}
                >
                  View job
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  )
}
