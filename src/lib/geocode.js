// Free OpenStreetMap Nominatim geocoding (no API key required)
// Rate limit: 1 req/sec — we space requests out
const cache = new Map()
let lastRequest = 0

export async function geocodeAddress(address) {
  if (!address) return null
  if (cache.has(address)) return cache.get(address)

  // Throttle to ~1 req/sec
  const wait = Math.max(0, 1100 - (Date.now() - lastRequest))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequest = Date.now()

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (data?.[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      cache.set(address, coords)
      return coords
    }
  } catch (e) {
    console.warn('Geocode failed:', address, e)
  }
  cache.set(address, null)
  return null
}

// Haversine straight-line distance in km
export function distanceKm(a, b) {
  if (!a || !b) return 0
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

// Estimate travel time for a route (assumes ~40km/h average urban speed)
export function estimateTravelMinutes(coords) {
  if (coords.length < 2) return 0
  let totalKm = 0
  for (let i = 0; i < coords.length - 1; i++) {
    totalKm += distanceKm(coords[i], coords[i + 1])
  }
  return Math.round((totalKm / 40) * 60)
}

// Total distance for a route
export function totalRouteKm(coords) {
  if (coords.length < 2) return 0
  let totalKm = 0
  for (let i = 0; i < coords.length - 1; i++) {
    totalKm += distanceKm(coords[i], coords[i + 1])
  }
  return totalKm
}

// OSRM road routing (free public demo server, no API key)
// Returns: { geometry: [[lat, lng], ...], distanceKm, durationMin } or null
const routeCache = new Map()

export async function getRoadRoute(points) {
  if (!points || points.length < 2) return null
  const key = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
  if (routeCache.has(key)) return routeCache.get(key)

  try {
    const coordsStr = points.map(p => `${p.lng},${p.lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) throw new Error('OSRM error ' + res.status)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route')
    const route = data.routes[0]
    // GeoJSON coords are [lng, lat] — convert to [lat, lng] for Leaflet
    const geometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    const result = {
      geometry,
      distanceKm: route.distance / 1000,
      durationMin: Math.round(route.duration / 60),
    }
    routeCache.set(key, result)
    return result
  } catch (e) {
    console.warn('Road routing failed:', e)
    return null
  }
}
