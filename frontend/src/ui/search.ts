import type { Site } from '../data/schemas'
import type { FeatureName } from '../scene/labels'
import type { Point } from '../state/store'
import { fmtCoords } from './format'

// Search bar (ui/SearchBar.tsx): known landing sites, IAU feature names and typed coordinates.
export type Hit = { kind: 'site' | 'feature' | 'coords'; label: string; sub: string; lat: number; lon: number; siteId?: string }

// Coordinates in the forms people type: "-89.45, -137.31", "-89.45 -137.31", "89.45S 137.31W", "89.45° S, 137.31° W".
// Latitude first. East longitude 0..360 is turned into -180..180. Null when the text is not coordinates.
export function parseCoords(q: string): Point | null {
  const m = q.trim().replace(/,(?=\d)/g, '.').match(/^([+-−]?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*([+-−]?\d+(?:\.\d+)?)\s*°?\s*([EW])?$/i)
  if (!m) return null
  let lat = Number(m[1].replace('−', '-')), lon = Number(m[3].replace('−', '-'))
  if (m[2]?.toUpperCase() === 'S') lat = -Math.abs(lat)
  if (m[4]?.toUpperCase() === 'W') lon = -Math.abs(lon)
  if (Math.abs(lat) > 90 || lon < -180 || lon > 360) return null
  return { lat, lon: lon > 180 ? lon - 360 : lon }
}

// Lower case without accents, so "schrodinger" finds "Schrödinger".
export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const TYPE: Record<string, string> = {
  AA: 'crater', ME: 'mare', OC: 'oceanus', LC: 'lacus', SI: 'sinus', PA: 'palus', MO: 'mons', RI: 'rima', DO: 'dorsum',
  CA: 'catena', VA: 'vallis', PR: 'promontorium', RU: 'rupes', ST: 'statio', PL: 'planitia', LF: 'astronaut-named feature', AL: 'albedo feature',
}

// Up to `max` hits: coordinates first, then sites, then features; within each, names that start with the query
// before names that only contain it. Features keep the gazetteer order (largest first).
export function search(q: string, sites: Site[], names: FeatureName[] | null, max = 8): Hit[] {
  const query = fold(q.trim())
  if (!query) return []
  const c = parseCoords(q)
  const hits: Hit[] = c ? [{ kind: 'coords', label: fmtCoords(c.lat, c.lon), sub: 'coordinates', ...c }] : []
  const rank = (name: string) => { const f = fold(name); return f.startsWith(query) ? 0 : f.split(/[\s(-]+/).some((w) => w.startsWith(query)) ? 1 : f.includes(query) ? 2 : 3 }
  const siteHits = sites.map((s) => ({ s, r: rank(s.name) })).filter((x) => x.r < 3).sort((a, b) => a.r - b.r)
    .map(({ s }): Hit => ({ kind: 'site', label: s.name, sub: `known landing site · ${fmtCoords(s.lat_deg, s.lon_deg)}`, lat: s.lat_deg, lon: s.lon_deg, siteId: s.id }))
  const featHits = (names ?? []).map((n) => ({ n, r: rank(n.name) })).filter((x) => x.r < 3).sort((a, b) => a.r - b.r)
    .map(({ n }): Hit => ({ kind: 'feature', label: n.name, sub: `${TYPE[n.code] ?? 'feature'}${n.dKm > 5 ? `, ${Math.round(n.dKm)} km` : ''} · ${fmtCoords(n.lat, n.lon)}`, lat: n.lat, lon: n.lon }))
  return [...hits, ...siteHits, ...featHits].slice(0, max)
}
