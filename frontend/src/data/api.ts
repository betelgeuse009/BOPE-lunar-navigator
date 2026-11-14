// Client for AERO's live API (contracts/API.md). The app works without it (static data/ files);
// when /api/health answers, the globe switches to live analysis.
import { z } from 'zod'
import { CONTRACT_VERSION } from './schemas'

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api'

export type Weights = { sunlit: number; dark: number; earth: number; noEarth: number }
export type Settings = { missionDays: number; obsHeightM: number; weights: Weights }

// API defaults (docs/PARAMETERS.md §1): 14 d mission, 2 m mast, weight 1 each.
export const DEFAULT_SETTINGS: Settings = {
  missionDays: 14,
  obsHeightM: 2,
  weights: { sunlit: 1, dark: 1, earth: 1, noEarth: 1 },
}

export function settingsQuery(s: Settings): Record<string, string> {
  return {
    mission_h: String(s.missionDays * 24),
    obs_height_m: String(s.obsHeightM),
    w_sunlit: String(s.weights.sunlit),
    w_dark: String(s.weights.dark),
    w_earth: String(s.weights.earth),
    w_no_earth: String(s.weights.noEarth),
  }
}

// /api/area refuses more than 2000 points; a disc of radius r with spacing r/20 has about pi*400 = 1257.
export const areaSpacingKm = (radiusKm: number) => radiusKm / 20

const metric = z.object({ value: z.number().nullable(), uncertainty: z.number().nullable() })

export const Evaluation = z.object({
  contract_version: z.string(),
  site: z.object({ lat_deg: z.number(), lon_deg: z.number(), obs_height_m: z.number() }),
  window: z.object({ start_utc: z.string(), end_utc: z.string(), duration_h: z.number() }),
  terrain_available: z.boolean(),
  horizon_source: z.string(),
  parameters: z.record(metric),
  feasible: z.boolean(),
  violations: z.array(z.unknown()),
  not_checked: z.array(z.string()),
  score: z.object({
    value: z.number().nullable(),
    components: z.record(z.object({ score: z.number().nullable(), weight: z.number() })),
  }),
})
export type Evaluation = z.infer<typeof Evaluation>

export const Area = z.object({
  contract_version: z.string(),
  radius_km: z.number(),
  terrain_available: z.boolean(),
  points: z.object({
    lat_deg: z.array(z.number()),
    lon_deg: z.array(z.number()),
    score: z.array(z.number().nullable()),
    feasible: z.array(z.boolean()),
  }),
  score_range: z.tuple([z.number(), z.number()]),
  center_score: z.number().nullable(),
  center_is_best: z.boolean(),
  best: z.object({
    index: z.number(), lat_deg: z.number(), lon_deg: z.number(), score: z.number().nullable(),
    score_gain: z.number().nullable(), dist_km: z.number(), bearing_deg: z.number(),
  }).nullable(),
})
export type Area = z.infer<typeof Area>

export async function apiAvailable(signal?: AbortSignal): Promise<boolean> {
  if (!API_BASE) return false
  try {
    const res = await fetch(`${API_BASE}/health`, { signal })
    return res.ok && (await res.json()).status === 'ok'
  } catch {
    return false
  }
}

export async function apiGet<S extends z.ZodTypeAny>(path: string, params: Record<string, string>, schema: S, signal?: AbortSignal): Promise<z.infer<S>> {
  const res = await fetch(`${API_BASE}/${path}?${new URLSearchParams(params)}`, { signal })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${path}: ${typeof body?.detail === 'string' ? body.detail : `HTTP ${res.status}`}`)
  if (body?.contract_version !== CONTRACT_VERSION) throw new Error(`${path}: contract_version ${body?.contract_version}, expected ${CONTRACT_VERSION}`)
  const r = schema.safeParse(body)
  if (!r.success) throw new Error(`${path}: unexpected response (${r.error.issues[0]?.path.join('.')} ${r.error.issues[0]?.message})`)
  return r.data
}
