// Primary: Google Places API (New) via REST — fast, accurate, AU-biased
// Fallback: free OpenStreetMap Nominatim (1 req/sec throttled)
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY
const cache = new Map()
let lastRequest = 0

async function throttle() {
  const wait = Math.max(0, 1100 - (Date.now() - lastRequest))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequest = Date.now()
}

export async function geocodeAddress(address) {
  if (!address) return null
  if (cache.has(address)) return cache.get(address)
  await throttle()
  try {
    // countrycodes=au biases results to Australia so we don't pick foreign streets
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(address)}`
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

// Google Places (New) Autocomplete — returns predictions.
// Each prediction only has placeId/text; we resolve lat/lng on selection via placeDetails().
async function googleAutocomplete(query, country = 'AU') {
  if (!GOOGLE_KEY) return null
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: [country.toLowerCase()],
        languageCode: 'en',
      }),
    })
    if (!res.ok) throw new Error('Places autocomplete ' + res.status)
    const data = await res.json()
    const suggestions = data.suggestions || []
    return suggestions
      .filter(s => s.placePrediction)
      .map(s => ({
        placeId: s.placePrediction.placeId,
        label: s.placePrediction.text?.text || '',
        lat: null,
        lng: null,
        address: {},
      }))
  } catch (e) {
    console.warn('Google autocomplete failed:', e)
    return null
  }
}

// Resolve a Google placeId to coords + formatted address
export async function placeDetails(placeId) {
  if (!GOOGLE_KEY || !placeId) return null
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'id,formattedAddress,location,displayName',
      },
    })
    if (!res.ok) throw new Error('Place details ' + res.status)
    const data = await res.json()
    return {
      label: data.formattedAddress || data.displayName?.text || '',
      lat: data.location?.latitude ?? null,
      lng: data.location?.longitude ?? null,
    }
  } catch (e) {
    console.warn('Place details failed:', e)
    return null
  }
}

// Search for multiple address candidates (for autocomplete dropdowns).
// Returns an array of { label, lat, lng, placeId? }. Prefers Google Places,
// falls back to Nominatim.
export async function searchAddresses(query, { limit = 6, country = 'au' } = {}) {
  if (!query || query.trim().length < 3) return []

  // Try Google Places first
  const google = await googleAutocomplete(query, country.toUpperCase())
  if (google && google.length > 0) return google.slice(0, limit)

  // Fallback: Nominatim
  await throttle()
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&countrycodes=${country}&q=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    return (data || []).map(r => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.address || {},
    }))
  } catch (e) {
    console.warn('Address search failed:', e)
    return []
  }
}

// Reverse geocode a coordinate to a human-readable address.
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null
  await throttle()
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (data?.display_name) return { label: data.display_name, lat, lng, address: data.address || {} }
  } catch (e) {
    console.warn('Reverse geocode failed:', e)
  }
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
