import { useEffect, useRef, useState } from 'react'
import { STRIP_DAYS, useApp, type Pin } from '../state/store'
import { Area, Ephemeris, Evaluation, Horizon, ScoreGrid, Windows, apiAvailable, apiGet, areaSpacingKm, limitsQuery, settingsQuery } from './api'
import { createLatestRunner } from './latest'
import { landingAt, parseFile } from './load'
import { Matrix, Scene } from './schemas'
import { SCORE_GRID_DEG, SCORE_MAP } from '../scene/layers'
import { STRIP_STEP_MIN } from '../ui/timeStrip'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

type Result<T> = { data: T | null; loading: boolean; error: string | null }
const idle = { data: null, loading: false, error: null }

// Runs the request for `key` (null = nothing to fetch). At most one request per hook is in flight; while it runs,
// newer keys replace each other and only the newest is sent next (see latest.ts). Old data stays visible, marked loading.
export function useApiRequest<T, P = Record<string, string>>(key: string | null, run: (params: P) => Promise<T>): Result<T> {
  const [state, setState] = useState<Result<T>>(idle)
  const keyRef = useRef(key)
  keyRef.current = key
  const runRef = useRef(run)
  runRef.current = run
  const runner = useRef<ReturnType<typeof createLatestRunner<string, { key: string; data: T }>> | null>(null)
  // One runner per mount. React StrictMode mounts twice in development; a runner cancelled by the first
  // (fake) unmount must not be reused, or every later result is dropped and the panel stays "Computing…".
  useEffect(() => {
    const r = createLatestRunner(
      async (k: string) => ({ key: k, data: await runRef.current(JSON.parse(k)) }),
      (res) => { if (res.key === keyRef.current) setState({ data: res.data, loading: false, error: null }) },
      (e) => setState((st) => ({ ...st, loading: false, error: e.message })),
    )
    runner.current = r
    return () => { r.cancel(); runner.current = null }
  }, [])
  useEffect(() => {
    if (key === null) return setState(idle)
    setState((st) => ({ ...st, loading: true, error: null }))
    runner.current?.request(key)
  }, [key])
  return state
}

export function useApiHealth() {
  const setMode = useApp((s) => s.setMode)
  useEffect(() => {
    const ctrl = new AbortController()
    apiAvailable(ctrl.signal).then((ok) => setMode(ok ? 'live' : 'static'))
    return () => ctrl.abort()
  }, [setMode])
}

// Live site x date matrix with the user's settings for the catalogue sites: STRIP_DAYS days from the day chosen in
// the calendar, or from the first day of the static matrix.
export function useLiveMatrix(base: Matrix | null, siteIds: string[]): Result<Matrix> {
  const { mode, settings, minuteUtc, stripStart } = useApp()
  const s = useDebounced(settings, 300)
  const params = base && mode === 'live'
    ? { ...settingsQuery(s), site_ids: siteIds.join(','), start_utc: landingAt(stripStart ?? base.landing_dates_utc[0], minuteUtc),
        n_dates: String(STRIP_DAYS), date_step_h: '24' }
    : null
  return useApiRequest(params && JSON.stringify(params), async (p) =>
    parseFile(Matrix, await apiGet('matrix', p, Matrix.passthrough()), '/api/matrix'))
}

export function useEvaluation(startUtc: string | undefined): Result<Evaluation> {
  const { mode, settings, point } = useApp()
  const s = useDebounced(settings, 300)
  const params = mode === 'live' && point && startUtc
    ? { ...settingsQuery(s), ...limitsQuery(s), lat_deg: point.lat.toFixed(4), lon_deg: point.lon.toFixed(4), start_utc: startUtc }
    : null
  return useApiRequest(params && JSON.stringify(params), (p) => apiGet('evaluate', p, Evaluation))
}

// Colour strip behind the time-of-day slider: one /api/matrix call with a landing every 10 min over the landing
// day, for the clicked point if there is one, otherwise for the catalogue sites (the strip then shows the best).
export function useDayStrip(dateUtc: string | undefined): Result<Matrix> {
  const { mode, settings, point } = useApp()
  const s = useDebounced(settings, 300)
  // Only for a chosen place: before a place is chosen there is nothing to colour.
  const params = mode === 'live' && dateUtc && point
    ? { ...settingsQuery(s), points: `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`, start_utc: landingAt(dateUtc, 0),
        n_dates: String((24 * 60) / STRIP_STEP_MIN), date_step_h: String(STRIP_STEP_MIN / 60) }
    : null
  return useApiRequest(params && JSON.stringify(params), async (p) =>
    parseFile(Matrix, await apiGet('matrix', p, Matrix.passthrough()), '/api/matrix'))
}

// The days of the date strip for the chosen place: one landing per day at the chosen time, with the user's settings.
export function usePointDays(firstDayUtc: string | undefined): Result<Matrix> {
  const { mode, settings, point, minuteUtc } = useApp()
  const s = useDebounced(settings, 300)
  const params = mode === 'live' && point && firstDayUtc
    ? { ...settingsQuery(s), points: `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`, start_utc: landingAt(firstDayUtc, minuteUtc),
        n_dates: String(STRIP_DAYS), date_step_h: '24' }
    : null
  return useApiRequest(params && JSON.stringify(params), async (p) =>
    parseFile(Matrix, await apiGet('matrix', p, Matrix.passthrough()), '/api/matrix'))
}

// /api/evaluate for every pinned place at its own landing date and time, with the current settings. Keyed by pin id,
// so a stale result never lands in the wrong column while a new pin is loading. Cheap after the first call:
// AERO caches Sun/Earth per month and skylines per point.
export function useCompareEvaluations(pins: Pin[]): Result<Record<string, Evaluation>> {
  const { mode, settings } = useApp()
  const s = useDebounced(settings, 300)
  const reqs = mode === 'live'
    ? pins.map((p) => ({ id: p.id, params: { ...settingsQuery(s), ...limitsQuery(s), lat_deg: p.lat.toFixed(4), lon_deg: p.lon.toFixed(4), start_utc: landingAt(p.dateUtc, p.minuteUtc) } }))
    : []
  return useApiRequest(reqs.length ? JSON.stringify(reqs) : null, async (list: typeof reqs) =>
    Object.fromEntries(await Promise.all(list.map(async (r) => [r.id, await apiGet('evaluate', r.params, Evaluation)] as const))))
}

export function useAreaSearch(startUtc: string | undefined): Result<Area> {
  const { mode, settings, point, radiusKm } = useApp()
  const s = useDebounced(settings, 300)
  const r = useDebounced(radiusKm, 300)
  const params = mode === 'live' && point && startUtc && r > 0
    ? { ...settingsQuery(s), ...limitsQuery(s), lat_deg: point.lat.toFixed(4), lon_deg: point.lon.toFixed(4), start_utc: startUtc,
        radius_km: String(r), spacing_km: areaSpacingKm(r).toFixed(3) }
    : null
  return useApiRequest(params && JSON.stringify(params), (p) => apiGet('area', p, Area))
}

// The "Score for your settings" map layer: the same nearby search, centred on the south pole and wide enough to
// reach 80 S. Asked only while that layer is chosen.
export function useScoreMap(startUtc: string | undefined): Result<Area> {
  const { mode, settings, layer } = useApp()
  const s = useDebounced(settings, 300)
  const params = mode === 'live' && layer === 'score' && startUtc
    ? { ...settingsQuery(s), ...limitsQuery(s), lat_deg: '-90', lon_deg: '0', start_utc: startUtc,
        radius_km: String(SCORE_MAP.radiusKm), spacing_km: String(SCORE_MAP.spacingKm) }
    : null
  return useApiRequest(params && JSON.stringify(params), (p) => apiGet('area', p, Area))
}

// The whole-Moon part of the same layer: one score per grid cell (smooth-sphere horizon, LOLA slope).
export function useScoreGrid(startUtc: string | undefined): Result<ScoreGrid> {
  const { mode, settings, layer } = useApp()
  const s = useDebounced(settings, 300)
  const params = mode === 'live' && layer === 'score' && startUtc
    ? { ...settingsQuery(s), ...limitsQuery(s), start_utc: startUtc, step_deg: String(SCORE_GRID_DEG) }
    : null
  return useApiRequest(params && JSON.stringify(params), (p) => apiGet('grid', p, ScoreGrid))
}

// Where the Sun is overhead at the landing time, for the lighting of the globe on any date (live mode).
export function useLiveScene(startUtc: string | undefined): Result<Scene> {
  const mode = useApp((s) => s.mode)
  const params = mode === 'live' && startUtc ? { start_utc: startUtc, mission_h: '2', step_s: '3600' } : null
  return useApiRequest(params && JSON.stringify(params), async (p) => parseFile(Scene, await apiGet('scene', p, Scene.passthrough()), '/api/scene'))
}

function useSiteWindow(startUtc: string | undefined): Record<string, string> | null {
  const { mode, settings, point } = useApp()
  const s = useDebounced(settings, 300)
  return mode === 'live' && point && startUtc
    ? { lat_deg: point.lat.toFixed(4), lon_deg: point.lon.toFixed(4), start_utc: startUtc, mission_h: String(s.missionDays * 24), obs_height_m: String(s.obsHeightM) }
    : null
}

// Sun and Earth in the sky of the chosen place over the stay, every 10 min: the position at landing, the plot, the CSV.
export function useEphemeris(startUtc: string | undefined): Result<Ephemeris> {
  const site = useSiteWindow(startUtc)
  return useApiRequest(site && JSON.stringify({ ...site, step_s: '600' }), (p) => apiGet('ephemeris', p, Ephemeris))
}

// Surface view of the chosen place: Sun and Earth every 10 min for `days` days from 00:00 UTC of the landing day,
// and the terrain skyline around the place (both depend on the observer height).
export function useSurfaceData(dayUtc: string | undefined, days: number): { eph: Result<Ephemeris>; hor: Result<Horizon> } {
  const { mode, settings, point } = useApp()
  const where = mode === 'live' && point
    ? { lat_deg: point.lat.toFixed(4), lon_deg: point.lon.toFixed(4), obs_height_m: String(settings.obsHeightM) }
    : null
  const eph = useApiRequest(where && dayUtc ? JSON.stringify({ ...where, start_utc: landingAt(dayUtc, 0), mission_h: String(days * 24), step_s: '600' }) : null,
    (p) => apiGet('ephemeris', p, Ephemeris))
  const hor = useApiRequest(where && JSON.stringify(where), (p) => apiGet('horizon', p, Horizon))
  return { eph, hor }
}

// The periods with the Sun up and with the Earth in view during the stay.
export function useWindows(startUtc: string | undefined): Result<Windows> {
  const site = useSiteWindow(startUtc)
  return useApiRequest(site && JSON.stringify(site), (p) => apiGet('metrics', p, Windows))
}

// The same periods over REPEAT_DAYS from the landing, whatever the stay, to measure how often they come back
// (10 min resolution is enough for a period of weeks).
export const REPEAT_DAYS = 90
export function useRepeatWindows(startUtc: string | undefined): Result<Windows> {
  const site = useSiteWindow(startUtc)
  return useApiRequest(site && JSON.stringify({ ...site, mission_h: String(REPEAT_DAYS * 24), calc_step_s: '600' }), (p) => apiGet('metrics', p, Windows))
}

// Distance to the Earth and to the Sun at the landing time, to draw them to scale. The server measures distances
// from a place on the surface; the centre of the near side (0 N, 0 E) is used, at most one Moon radius from the centre.
export function useSkyDistances(startUtc: string | undefined): { earthKm: number; sunKm: number } | null {
  const mode = useApp((s) => s.mode)
  const params = mode === 'live' && startUtc ? { lat_deg: '0', lon_deg: '0', start_utc: startUtc, mission_h: '2', step_s: '3600' } : null
  const e = useApiRequest(params && JSON.stringify(params), (p) => apiGet('ephemeris', p, Ephemeris)).data
  const earthKm = e?.earth_dist_km?.[0], sunKm = e?.sun_dist_km?.[0]
  return earthKm && sunKm ? { earthKm, sunKm } : null
}
