import type { LimitKey, Limits, ProfileId, Settings } from '../data/api'
import type { TopicId } from '../docs/topics'

// Mission types and the minimum requirements they switch on. Every value carries its source; a value we could not
// find published is null (switched on, entered by the user), never guessed. AERO reviews these for PARAMETERS.md (T30).
type Cited = { value: number | null; source: string }
type Profile = { label: string; description: string; missionDays?: Cited; limits: Partial<Record<LimitKey, Cited>> }

const NASA_REQ = 'NASA, "Key Artemis III Landing Requirements", Artemis overview 2025, NTRS 20250009323, '
  + 'https://ntrs.nasa.gov/api/citations/20250009323/downloads/ArtemisOverview2025IntSPAPPSChallenge.pdf'
const OWN = "No single published value fits every lander: enter your lander's value."

export const PROFILES: Record<ProfileId, Profile> = {
  none: { label: 'No limits', description: 'Score only. Switch on any limit below by hand.', limits: {} },
  robotic: {
    label: 'Robotic lander',
    description: 'Switches on the limits a robotic lander usually has. Slope tolerance, battery for the night and link needs '
      + "depend on the lander, and we found no value that applies to all of them, so enter your lander's numbers.",
    limits: {
      max_slope_deg: { value: null, source: OWN },
      max_dark_h: { value: null, source: OWN },
      min_earth_visible_frac: { value: null, source: OWN },
    },
  },
  crewed: {
    label: 'Crewed',
    description: "NASA's published landing requirements for the first crewed south-pole landing, written for Artemis III "
      + '(that flight is now an Earth-orbit test in 2027; the landing is planned for Artemis IV). Also required but not '
      + 'checked here: land within 6° of the south pole and within 100 m of the target; EVA slopes under 20° over 2 km.',
    missionDays: { value: 6.5, source: 'NASA, 19 Aug 2022: "a 6.5-day period, the planned duration of the Artemis III surface mission", '
      + 'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/' },
    limits: {
      max_slope_deg: { value: 10, source: `${NASA_REQ}: "Surface slope for landing (100m): <10 deg". Our slope uses an 80 m baseline.` },
      max_dark_h: { value: 0, source: `${NASA_REQ}: "require the surface to be lit for the duration of the surface stay".` },
      min_earth_visible_frac: { value: 0.25, source: `${NASA_REQ}: direct-with-Earth link, areas with "Earth visibility < 25%" excluded. `
        + 'NASA applies it to long-term visibility; here it is applied to the mission window.' },
    },
  },
}

export function profileSettings(id: ProfileId): Partial<Settings> {
  const p = PROFILES[id]
  const limits: Limits = Object.fromEntries(Object.entries(p.limits).map(([k, c]) => [k, c!.value]))
  return { profile: id, limits, ...(p.missionDays ? { missionDays: p.missionDays.value! } : {}) }
}

// How each limit is shown and typed. Fractions are typed as percent.
// scale: factor from the API unit to the typed unit (pct = 100; H is sent in metres and typed in centimetres).
export const LIMITS: { key: LimitKey; label: string; unit: string; pct?: boolean; scale?: number; max: number; help: TopicId }[] = [
  { key: 'max_slope_deg', label: 'Max landing slope', unit: '°', max: 90, help: 'slope' },
  { key: 'max_dark_h', label: 'Max longest night', unit: 'h', max: 1000, help: 'longest-night' },
  { key: 'min_sunlit_frac', label: 'Min sunlight', unit: '%', pct: true, max: 100, help: 'sunlight' },
  { key: 'min_earth_visible_frac', label: 'Min Earth in view', unit: '%', pct: true, max: 100, help: 'earth-in-view' },
  { key: 'max_no_earth_h', label: 'Max longest blackout', unit: 'h', max: 1000, help: 'longest-blackout' },
  { key: 'max_rock_abundance_frac', label: 'Max rock abundance', unit: '%', pct: true, max: 100, help: 'rock-abundance' },
  { key: 'max_surface_temp_k', label: 'Max surface temperature', unit: 'K', max: 1000, help: 'surface-temperature' },
  { key: 'max_h_parameter_m', label: 'Max H-parameter', unit: 'cm', scale: 100, max: 100, help: 'h-parameter' },
]

// "Max landing slope: 13.1° (limit 10°)" from an /api/evaluate violation.
export function describeViolation(v: { limit?: string; value?: number | null; limit_value?: number }): string {
  const l = LIMITS.find((x) => x.key === v.limit)
  if (!l) return `${v.limit}: ${v.value} (limit ${v.limit_value})`
  const f = (x: number | null | undefined) => (x == null ? 'n/a' : l.pct ? `${+(x * 100).toFixed(x < 0.1 ? 2 : 0)} %`
    : `${+(x * (l.scale ?? 1)).toFixed(1)}${l.unit === '°' ? '°' : ` ${l.unit}`}`)
  return `${l.label}: ${f(v.value)} (limit ${f(v.limit_value)})`
}

export const limitLabel = (key: string) => LIMITS.find((l) => l.key === key)?.label ?? key
