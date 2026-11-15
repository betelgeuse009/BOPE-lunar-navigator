import type { LimitKey, Limits, ProfileId } from '../data/api'
import type { RefId } from '../docs/topics'

// Warning level of a value in the Results pane and the comparison (documentation: topic "warnings").
//   bad  (red, ✕)  breaks a requirement the user set
//   warn (amber, !) at risk (met here, broken within the uncertainty, from the server), not checked, or outside a
//                   default band. Default bands apply before any requirement is set: a published value where one exists,
//                   our own choice otherwise (said so). A default band never gives red.
//   ok   (green, ✓) meets the requirement, or inside the default band
// No requirement and no band for the field: no level (null), nothing is shown.
export type Level = 'ok' | 'warn' | 'bad'
export type Verdict = { level: Level; text: string }
export type WarnContext = { limits: Limits; atRisk?: string[]; profile: ProfileId }

// Requirement -> the parameter it checks and its direction (analysis/scoring.py LIMITS).
export const LIMIT_FIELD: Record<LimitKey, { field: string; atLeast: boolean }> = {
  max_slope_deg: { field: 'slope_deg', atLeast: false },
  max_dark_h: { field: 'longest_dark_h', atLeast: false },
  min_sunlit_frac: { field: 'sunlit_frac', atLeast: true },
  min_earth_visible_frac: { field: 'earth_visible_frac', atLeast: true },
  max_no_earth_h: { field: 'longest_no_earth_h', atLeast: false },
  max_rock_abundance_frac: { field: 'rock_abundance_frac', atLeast: false },
  max_surface_temp_k: { field: 'surface_temp_max_k', atLeast: false },
  max_h_parameter_m: { field: 'h_parameter_m', atLeast: false },
}

// Default bands: amber when `warnIf` holds. `ref` = published source; without it the value is our choice.
// For the countdowns a null value means "not during the stay" (never lost), which is fine.
export type Band = { field: string; label: string; warnIf: (v: number) => boolean; nullOk?: boolean; text: string; ref?: RefId; crewedOnly?: boolean }
export const BANDS: Band[] = [
  { field: 'slope_deg', label: 'Slope above 10°', warnIf: (v) => v > 10, text: 'Steeper than 10°, the Artemis III limit for landing (over 100 m).', ref: 'nasaReq' },
  { field: 'earth_visible_frac', label: 'Earth in view below 25 %', warnIf: (v) => v < 0.25, text: 'Earth in view less than 25 % of the time: Artemis III excludes such areas for the direct link.', ref: 'nasaReq' },
  { field: 'longest_dark_h', label: 'Any night (crewed)', warnIf: (v) => v > 0, crewedOnly: true, text: 'Dark at some point of the stay: Artemis III requires the surface to be lit for the whole stay.', ref: 'nasaReq' },
  { field: 'sunlit_frac', label: 'Sunlight below 50 %', warnIf: (v) => v < 0.5, text: 'Sunlit less than half of the stay (our default band, not a published limit).' },
  { field: 'hours_to_first_dark_h', label: 'Sunset within 24 h', warnIf: (v) => v < 24, nullOk: true, text: 'The Sun sets less than 24 h after landing, or is already down (our default band).' },
  { field: 'hours_to_first_earth_loss_h', label: 'Earthset within 24 h', warnIf: (v) => v < 24, nullOk: true, text: 'The Earth sets less than 24 h after landing, or is already down (our default band).' },
  { field: 'longest_no_earth_h', label: 'Blackout over 72 h', warnIf: (v) => v > 72, text: 'More than 72 h in a row without the Earth in view (our default band).' },
  { field: 'rock_abundance_frac', label: 'Rocks above 1 %', warnIf: (v) => v > 0.01, text: 'Rockier than 98 % of the Moon (above 1 % rock cover; our default band from the map statistics).' },
  { field: 'surface_temp_max_k', label: 'Peak above 395 K', warnIf: (v) => v > 395, text: 'Hotter peak than 98 % of the Moon (above 395 K; our default band from the map statistics).' },
  { field: 'score', label: 'Score below 0.5', warnIf: (v) => v < 0.5, text: 'Score below 0.5 (our default band).' },
]

const fmtLimit = (k: LimitKey, v: number) =>
  k.endsWith('_frac') ? `${+(v * 100).toFixed(2)} %` : k.endsWith('_deg') ? `${v}°` : k.endsWith('_k') ? `${v} K`
    : k.endsWith('_m') ? `${+(v * 100).toFixed(1)} cm` : `${v} h`

// `value`: the parameter's value; null = the API's null (no data, or "never" for the countdowns).
export function assess(field: string, value: number | null | undefined, ctx: WarnContext): Verdict | null {
  if (value === undefined) return null
  const req = (Object.keys(LIMIT_FIELD) as LimitKey[]).find((k) => LIMIT_FIELD[k].field === field && ctx.limits[k] != null)
  if (req) {
    const limit = ctx.limits[req]!, { atLeast } = LIMIT_FIELD[req]
    const want = `${atLeast ? 'at least' : 'at most'} ${fmtLimit(req, limit)}`
    if (value === null) return { level: 'warn', text: `Not checked: no value here (your requirement: ${want}).` }
    if (atLeast ? value < limit : value > limit) return { level: 'bad', text: `Breaks your requirement: ${want}.` }
    if (ctx.atRisk?.includes(req)) return { level: 'warn', text: `At risk: meets your requirement (${want}) here, but not everywhere within the landing and skyline uncertainty.` }
    return { level: 'ok', text: `Meets your requirement: ${want}.` }
  }
  const band = BANDS.find((b) => b.field === field && (!b.crewedOnly || ctx.profile === 'crewed'))
  if (!band) return null
  if (value === null) return band.nullOk ? { level: 'ok', text: 'Not during the stay.' } : null
  return band.warnIf(value) ? { level: 'warn', text: band.text } : { level: 'ok', text: `Within the default band (${band.label.toLowerCase()} would be flagged).` }
}

export const LEVEL_SIGN: Record<Level, string> = { ok: '✓', warn: '!', bad: '✕' }
