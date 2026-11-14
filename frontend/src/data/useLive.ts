import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { Area, Evaluation, apiAvailable, apiGet, areaSpacingKm, settingsQuery } from './api'
import { parseFile } from './load'
import { Matrix } from './schemas'

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

// Runs one API request whenever `key` changes (null = nothing to fetch); aborts the previous one.
function useApiRequest<T>(key: string | null, run: (signal: AbortSignal) => Promise<T>): Result<T> {
  const [state, setState] = useState<Result<T>>(idle)
  useEffect(() => {
    if (key === null) return setState(idle)
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    run(ctrl.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e: Error) => { if (!ctrl.signal.aborted) setState({ data: null, loading: false, error: e.message }) })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// Live site x date matrix with the user's settings; the static matrix supplies the site list and dates.
export function useLiveMatrix(base: Matrix | null): Result<Matrix> {
  const { mode, settings } = useApp()
  const s = useDebounced(settings, 300)
  const params = base && mode === 'live'
    ? { ...settingsQuery(s), site_ids: base.site_ids.join(','), start_utc: base.landing_dates_utc[0],
        n_dates: String(base.landing_dates_utc.length), date_step_h: '24' }
    : null
  return useApiRequest(params && JSON.stringify(params), async (signal) =>
    parseFile(Matrix, await apiGet('matrix', params!, Matrix.passthrough(), signal), '/api/matrix'))
}

export function useEvaluation(startUtc: string | undefined): Result<Evaluation> {
  const { mode, settings, point } = useApp()
  const s = useDebounced(settings, 300)
  const params = mode === 'live' && point && startUtc
    ? { ...settingsQuery(s), lat_deg: point.lat.toFixed(4), lon_deg: point.lon.toFixed(4), start_utc: startUtc }
    : null
  return useApiRequest(params && JSON.stringify(params), (signal) => apiGet('evaluate', params!, Evaluation, signal))
}

export function useAreaSearch(startUtc: string | undefined): Result<Area> {
  const { mode, settings, point, radiusKm } = useApp()
  const s = useDebounced(settings, 300)
  const r = useDebounced(radiusKm, 300)
  const params = mode === 'live' && point && startUtc && r > 0
    ? { ...settingsQuery(s), lat_deg: point.lat.toFixed(4), lon_deg: point.lon.toFixed(4), start_utc: startUtc,
        radius_km: String(r), spacing_km: areaSpacingKm(r).toFixed(3) }
    : null
  return useApiRequest(params && JSON.stringify(params), (signal) => apiGet('area', params!, Area, signal))
}
