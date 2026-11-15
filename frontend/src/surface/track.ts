import type { Ephemeris } from '../data/api'

// Reading the server's Sun/Earth time series at any time between its samples (10 min). Display only: linear
// interpolation between samples, azimuth across 0/360. Visibility (visible part of the disc, terrain included)
// comes from the server; rises and sets are where it crosses one half.
export const STEP_MIN = 10
export const WINDOW_DAYS = 30

export type BodyNow = { az: number; el: number; vis: number; radiusDeg: number; distKm: number | null }

const lerp = (a: number, b: number, f: number) => a + (b - a) * f
const lerpAz = (a: number, b: number, f: number) => {
  const d = ((b - a + 540) % 360) - 180
  return (a + d * f + 360) % 360
}

export function bodyAt(e: Ephemeris, body: 'sun' | 'earth', tMin: number): BodyNow {
  const n = e.time_utc.length
  const x = Math.min(Math.max(tMin / STEP_MIN, 0), n - 1)
  const i = Math.min(Math.floor(x), n - 2), f = x - i
  const az = body === 'sun' ? e.sun_az_deg : e.earth_az_deg
  const el = body === 'sun' ? e.sun_el_deg : e.earth_el_deg
  const vis = body === 'sun' ? e.sun_visible_frac : e.earth_visible_frac
  const rad = body === 'sun' ? e.sun_radius_deg : e.earth_radius_deg
  const dist = body === 'sun' ? e.sun_dist_km : e.earth_dist_km
  return {
    az: lerpAz(az[i], az[i + 1], f), el: lerp(el[i], el[i + 1], f), vis: lerp(vis[i], vis[i + 1], f),
    radiusDeg: rad ? lerp(rad[i], rad[i + 1], f) : body === 'sun' ? 0.267 : 0.95,
    distKm: dist ? lerp(dist[i], dist[i + 1], f) : null,
  }
}

export function phaseAt(e: Ephemeris, tMin: number): number | null {
  if (!e.earth_phase_frac) return null
  const x = Math.min(Math.max(tMin / STEP_MIN, 0), e.earth_phase_frac.length - 1)
  const i = Math.min(Math.floor(x), e.earth_phase_frac.length - 2)
  return lerp(e.earth_phase_frac[i], e.earth_phase_frac[i + 1], x - i)
}

// Next change of visibility (rise if the body is now hidden, set if it is now in view), in minutes from tMin; null = none
// left in the window. "In view" = at least half of the disc above the skyline, as everywhere in the navigator.
export function nextChange(vis: number[], tMin: number): { kind: 'rise' | 'set'; inMin: number } | null {
  const k0 = Math.min(Math.max(Math.round(tMin / STEP_MIN), 0), vis.length - 1)
  const up = vis[k0] >= 0.5
  for (let k = k0 + 1; k < vis.length; k++) {
    if ((vis[k] >= 0.5) !== up) return { kind: up ? 'set' : 'rise', inMin: k * STEP_MIN - tMin }
  }
  return null
}

// Unit vector of a direction (azimuth clockwise from north, elevation up) in the scene: x east, y up, -z north.
export function dir(azDeg: number, elDeg: number): [number, number, number] {
  const a = (azDeg * Math.PI) / 180, e = (elDeg * Math.PI) / 180
  return [Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)]
}

export const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const cardinal = (az: number) => CARDINALS[Math.round((((az % 360) + 360) % 360) / 45) % 8]
