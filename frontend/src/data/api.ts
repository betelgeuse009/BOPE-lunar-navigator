// Client for AERO's live API (contracts/API.md). The app works without it (static data/ files);
// when /api/health answers, the globe switches to live analysis.
import { z } from 'zod'
import { CONTRACT_VERSION } from './schemas'

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api'

export type Weights = { sunlit: number; dark: number; earth: number; noEarth: number; slope: number; rock: number; temp: number; hpar: number }
// User limits (docs/PARAMETERS.md §3). Key present = switched on; null = on but no value entered yet (not sent).
export type LimitKey = 'max_slope_deg' | 'max_dark_h' | 'min_sunlit_frac' | 'min_earth_visible_frac' | 'max_no_earth_h'
  | 'max_rock_abundance_frac' | 'max_surface_temp_k' | 'max_h_parameter_m'
export type Limits = Partial<Record<LimitKey, number | null>>
export type ProfileId = 'none' | 'robotic' | 'crewed'
export type Settings = { missionDays: number; obsHeightM: number; horizonUncDeg: number; weights: Weights; profile: ProfileId; limits: Limits }

// API defaults (docs/PARAMETERS.md §1): 14 d mission, 2 m mast, weight 1 each (slope included since the terrain, T28);
// the regolith factors (rock abundance, maximum temperature, H-parameter) are off by default (weight 0).
export const DEFAULT_SETTINGS: Settings = {
  missionDays: 14,
  obsHeightM: 2,
  horizonUncDeg: 0.1, // API default (contracts/API.md): accuracy of the LOLA skyline
  weights: { sunlit: 1, dark: 1, earth: 1, noEarth: 1, slope: 1, rock: 0, temp: 0, hpar: 0 },
  profile: 'none',
  limits: {},
}

export function settingsQuery(s: Settings): Record<string, string> {
  return {
    mission_h: String(s.missionDays * 24),
    obs_height_m: String(s.obsHeightM),
    w_sunlit: String(s.weights.sunlit),
    w_dark: String(s.weights.dark),
    w_earth: String(s.weights.earth),
    w_no_earth: String(s.weights.noEarth),
    w_slope: String(s.weights.slope),
    w_rock: String(s.weights.rock),
    w_temp: String(s.weights.temp),
    w_h: String(s.weights.hpar),
  }
}

// Limits go only to /evaluate and /area (the endpoints that judge feasibility).
export function limitsQuery(s: Settings): Record<string, string> {
  return Object.fromEntries(Object.entries(s.limits).flatMap(([k, v]) => (v == null ? [] : [[k, String(v)]])))
}

// Skyline uncertainty goes only to /evaluate: it sets the ± of the numbers, not the score maps or the matrix.
export const uncertaintyQuery = (s: Settings): Record<string, string> => ({ horizon_uncertainty_deg: String(s.horizonUncDeg) })

// /api/area refuses more than 2000 points; a disc of radius r with spacing r/20 has about pi*400 = 1257.
export const areaSpacingKm = (radiusKm: number) => radiusKm / 20

const metric = z.object({ value: z.number().nullable(), uncertainty: z.number().nullable() })

export const Evaluation = z.object({
  contract_version: z.string(),
  site: z.object({ lat_deg: z.number(), lon_deg: z.number(), obs_height_m: z.number() }),
  window: z.object({ start_utc: z.string(), end_utc: z.string(), duration_h: z.number() }),
  terrain_available: z.boolean(),
  horizon_source: z.string(),
  // What the terrain numbers rest on (contracts/API.md, /api/evaluate "terrain"). Absent or partial without the maps.
  terrain: z.object({
    dem_product: z.string().nullable(), dem_resolution_m: z.number().nullable(),
    slope_source: z.string().nullable(), slope_baseline_m: z.number().nullable(), height_error_m: z.number().nullable(),
  }).partial().optional(),
  parameters: z.record(metric),
  feasible: z.boolean(),
  violations: z.array(z.object({ limit: z.string(), parameter: z.string(), value: z.number().nullable(), limit_value: z.number() }).partial()),
  not_checked: z.array(z.string()),
  score: z.object({
    value: z.number().nullable(),
    uncertainty: z.number().nullable().optional(),
    components: z.record(z.object({ score: z.number().nullable(), weight: z.number() })),
  }),
  // AERO #22 (T22): limits met at the point but broken within the landing/skyline uncertainty, and the ranges found.
  requirements_at_risk: z.array(z.string()).optional(),
  uncertainty_model: z.object({
    position_uncertainty_m: z.number().optional(),
    // Per parameter: the part of the ± from the landing position (`position`, ring at position_uncertainty_m) and from
    // the skyline (`horizon`), and the range found (contracts/API.md).
    components: z.record(z.object({ range: z.tuple([z.number(), z.number()]).nullable().optional(),
      position: z.number().nullable().optional(), horizon: z.number().nullable().optional() })).optional(),
  }).optional(),
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

const nums = z.array(z.number())
// /api/ephemeris: Sun and Earth as seen from the place, one entry per time step (contracts/schemas/ephemeris.schema.json).
export const Ephemeris = z.object({
  contract_version: z.string(),
  time_utc: z.array(z.string()),
  sun_az_deg: nums, sun_el_deg: nums, sun_visible_frac: nums,
  earth_az_deg: nums, earth_el_deg: nums, earth_visible_frac: nums,
  sun_dist_km: nums.optional(), earth_dist_km: nums.optional(),
  sun_radius_deg: nums.optional(), earth_radius_deg: nums.optional(), earth_phase_frac: nums.optional(),
  sun_ra_deg: nums.optional(), sun_dec_deg: nums.optional(), earth_ra_deg: nums.optional(), earth_dec_deg: nums.optional(),
})
export type Ephemeris = z.infer<typeof Ephemeris>

// /api/horizon: the terrain skyline seen from the place, elevation of the skyline at every azimuth (horizon.schema.json).
export const Horizon = z.object({
  contract_version: z.string(), observer_height_m: z.number(), azimuth_deg: nums, horizon_elev_deg: nums,
})
export type Horizon = z.infer<typeof Horizon>

// /api/metrics: only the periods with the Sun up and with the Earth in view are used here.
const win = z.object({ start_utc: z.string(), end_utc: z.string() })
export const Windows = z.object({ contract_version: z.string(), sun_windows: z.array(win), earth_windows: z.array(win) })
export type Windows = z.infer<typeof Windows>

// /api/grid: the score of every cell of a whole-Moon grid (rows north to south, columns west to east).
export const ScoreGrid = z.object({
  step_deg: z.number(), lat_deg: nums, lon_deg: nums,
  score: z.array(z.array(z.number().nullable())), score_range: z.tuple([z.number(), z.number()]).nullable(),
})
export type ScoreGrid = z.infer<typeof ScoreGrid>

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
