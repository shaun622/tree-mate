import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

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
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
            eventHandlers={{ click: () => onMarkerClick?.(p) }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{p.label || `Stop ${i + 1}`}</p>
                {p.subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{p.subtitle}</p>}
                {p.time && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#15803d', fontWeight: 600 }}>{p.time}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  )
}
