import type { Point } from '../state/store'

// Typed coordinates of the Place block (ui/PlaceInput.tsx). Same convention as the
// analysis server (contracts/API.md): planetocentric latitude -90..90, east longitude -180..180 (0..360 accepted).
export function parsePlace(latText: string, lonText: string): Point | string {
  const lat = Number(latText.replace(',', '.')), lon = Number(lonText.replace(',', '.'))
  if (latText.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be between −90 and 90.'
  if (lonText.trim() === '' || !Number.isFinite(lon) || lon < -180 || lon > 360) return 'Longitude must be between −180 and 360.'
  return { lat, lon: lon > 180 ? lon - 360 : lon }
}

