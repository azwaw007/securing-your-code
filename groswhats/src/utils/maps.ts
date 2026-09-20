/** Build / parse Google Maps links for client locations (no API key). */

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function mapsCoordsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/** Navigation GPS : de ma position vers le magasin. */
export function mapsDirectionsUrl(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`
}

/** Itinéraire multi-magasins (Google Maps, ordre donné). */
export function mapsRouteUrl(
  points: Array<{ lat: number; lng: number }>,
): string | null {
  if (points.length === 0) return null
  if (points.length === 1) return mapsCoordsUrl(points[0].lat, points[0].lng)
  const path = points.map((p) => `${p.lat},${p.lng}`).join('/')
  return `https://www.google.com/maps/dir/${path}`
}

/** Aperçu carte sans clé API (OpenStreetMap — l’ancien embed Google est souvent vide). */
export function mapsEmbedUrl(lat: number, lng: number, zoom = 16): string {
  // delta approx. selon zoom pour cadrer le marqueur
  const span = Math.max(0.002, 0.18 / Math.pow(2, Math.max(0, zoom - 10)))
  const west = lng - span
  const east = lng + span
  const south = lat - span * 0.7
  const north = lat + span * 0.7
  const bbox = `${west}%2C${south}%2C${east}%2C${north}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
}

export function clientMapsUrl(client: {
  name: string
  address?: string
  city?: string
  lat?: number
  lng?: number
}): string | null {
  if (typeof client.lat === 'number' && typeof client.lng === 'number') {
    return mapsCoordsUrl(client.lat, client.lng)
  }
  const parts = [client.address, client.city, client.name].filter(Boolean)
  if (parts.length === 0) return null
  return mapsSearchUrl(parts.join(', '))
}

/** Extract lat/lng from common Google Maps / geo URLs or "lat,lng" text. */
export function parseMapsCoords(input: string): { lat: number; lng: number } | null {
  const text = input.trim()
  if (!text) return null

  const at = text.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
  if (at) {
    const lat = Number(at[1])
    const lng = Number(at[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  const q = text.match(/[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
  if (q) {
    const lat = Number(q[1])
    const lng = Number(q[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  const plain = text.match(/^(-?\d+\.?\d+)\s*,\s*(-?\d+\.?\d+)$/)
  if (plain) {
    const lat = Number(plain[1])
    const lng = Number(plain[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  return null
}

export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
        })
      },
      () => reject(new Error('denied')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}
