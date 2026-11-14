import type { Area, Evaluation } from '../data/api'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { FACTORS } from './SettingsPanel'

const fmtH = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v)} h`)
const fmtPct = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v * 100)} %`)
const fmtDeg = (v: number | null | undefined) => (v == null ? 'n/a' : `${v.toFixed(1)}°`)

// Result for the clicked point: score, what makes it up, the key numbers, and the nearby search.
export function EvaluationPanel({ ev, loading, error, area, areaLoading, areaError }: {
  ev: Evaluation | null; loading: boolean; error: string | null
  area: Area | null; areaLoading: boolean; areaError: string | null
}) {
  const { point, setPoint, radiusKm } = useApp()
  if (!point) return null
  const p = ev?.parameters
  const v = (k: string) => p?.[k]?.value ?? null
  const comps = ev?.score.components ?? {}
  const wSum = FACTORS.reduce((s, f) => s + (comps[f.api]?.score != null ? comps[f.api].weight : 0), 0)

  return (
    <aside className="panel evaluation" aria-busy={loading}>
      <div className="panel-head">
        <h2>{Math.abs(point.lat).toFixed(2)}° {point.lat < 0 ? 'S' : 'N'}, {Math.abs(point.lon).toFixed(2)}° {point.lon < 0 ? 'W' : 'E'}</h2>
        <button type="button" className="close" onClick={() => setPoint(null)} aria-label="Close">×</button>
      </div>
      {error && <p className="error-inline">{error}</p>}
      {!ev && loading && <p className="note">Computing…</p>}
      {ev && (
        <>
          <p className="score">
            <i style={{ background: metricColor(ev.score.value) }} />
            Score <strong>{ev.score.value?.toFixed(2) ?? 'n/a'}</strong>
            <span className={ev.feasible ? 'ok' : 'bad'}>{ev.feasible ? 'meets all limits' : 'breaks a limit'}</span>
          </p>
          <table className="breakdown">
            <caption>What makes up the score</caption>
            <thead><tr><th>Factor</th><th>Sub-score</th><th>Weight</th><th>Share</th></tr></thead>
            <tbody>
              {FACTORS.map((f) => {
                const c = comps[f.api]
                const share = c?.score != null && wSum > 0 ? (c.score * c.weight) / wSum : null
                return (
                  <tr key={f.key}>
                    <td>{f.label}</td>
                    <td>{c?.score?.toFixed(2) ?? 'n/a'}</td>
                    <td>{c?.weight ?? 0}</td>
                    <td><span className="bar" style={{ width: `${(share ?? 0) * 100}%` }} />{share?.toFixed(2) ?? '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <dl className="numbers">
            <div><dt>Sunlight</dt><dd>{fmtPct(v('sunlit_frac'))}</dd></div>
            <div><dt>Longest night</dt><dd>{fmtH(v('longest_dark_h'))}</dd></div>
            <div><dt>First sunset after landing</dt><dd>{v('hours_to_first_dark_h') == null ? 'none in the stay' : fmtH(v('hours_to_first_dark_h'))}</dd></div>
            <div><dt>Mean Sun elevation when lit</dt><dd>{fmtDeg(v('mean_sun_el_when_lit_deg'))}</dd></div>
            <div><dt>Earth in view</dt><dd>{fmtPct(v('earth_visible_frac'))}</dd></div>
            <div><dt>Longest blackout</dt><dd>{fmtH(v('longest_no_earth_h'))}</dd></div>
            <div><dt>First Earthset after landing</dt><dd>{v('hours_to_first_earth_loss_h') == null ? 'none in the stay' : fmtH(v('hours_to_first_earth_loss_h'))}</dd></div>
          </dl>
          {!ev.terrain_available && (
            <p className="note">Terrain not included yet (horizon: {ev.horizon_source}). Near the pole real hills block the low Sun, so these numbers are optimistic.</p>
          )}
        </>
      )}
      {radiusKm > 0 && (
        <div className="nearby">
          <h3>Within {radiusKm} km</h3>
          {areaError && <p className="error-inline">{areaError}</p>}
          {!area && areaLoading && <p className="note">Searching…</p>}
          {area && (
            area.center_is_best || !area.best
              ? <p>No nearby point scores better. Scores here range {area.score_range[0].toFixed(3)} to {area.score_range[1].toFixed(3)}.</p>
              : <p>
                  Best point {area.best.dist_km.toFixed(1)} km away, bearing {Math.round(area.best.bearing_deg)}°, scores{' '}
                  {area.best.score?.toFixed(3)} (+{area.best.score_gain?.toFixed(3)}). Range here {area.score_range[0].toFixed(3)} to {area.score_range[1].toFixed(3)}.
                </p>
          )}
        </div>
      )}
    </aside>
  )
}
