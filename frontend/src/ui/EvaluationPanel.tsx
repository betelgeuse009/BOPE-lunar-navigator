import { limitsQuery, type Area, type Evaluation } from '../data/api'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { FACTORS } from './factors'
import { describeViolation, limitLabel } from './profiles'
import { PinButton } from './ComparePanel'
import { fmtCoords, fmtDeg, fmtH, fmtM, fmtPct, fmtUnc, untilLoss } from './format'

// Result for the clicked point: score, what makes it up, the key numbers, and the nearby search.
export function EvaluationPanel({ ev, loading, error, area, areaLoading, areaError }: {
  ev: Evaluation | null; loading: boolean; error: string | null
  area: Area | null; areaLoading: boolean; areaError: string | null
}) {
  const { point, setPoint, radiusKm, settings } = useApp()
  const hasLimits = Object.keys(limitsQuery(settings)).length > 0
  if (!point) return null
  const p = ev?.parameters
  const v = (k: string) => p?.[k]?.value ?? null
  // Value ± uncertainty, or the range found when ± would cross a physical limit (contracts/API.md).
  const u = (k: string, fmt: (x: number) => string, bounds?: [number, number]) => {
    const c = p?.[k]
    return c?.value == null ? 'n/a' : fmtUnc(fmt, c.value, c.uncertainty, ev?.uncertainty_model?.components?.[k]?.range, bounds)
  }
  const pos = ev?.uncertainty_model?.position_uncertainty_m
  const comps = ev?.score.components ?? {}
  const wSum = FACTORS.reduce((s, f) => s + (comps[f.api]?.score != null ? comps[f.api].weight : 0), 0)

  return (
    <aside className={`panel evaluation${loading ? ' stale' : ''}`} aria-busy={loading}>
      <div className="panel-head">
        <h2>{fmtCoords(point.lat, point.lon)}</h2>
        <button type="button" className="close" onClick={() => setPoint(null)} aria-label="Close">×</button>
      </div>
      <PinButton label={`Point ${fmtCoords(point.lat, point.lon)}`} lat={point.lat} lon={point.lon} />
      {error && <p className="error-inline">{error}</p>}
      {!ev && loading && <p className="note">Computing…</p>}
      {ev && loading && <p className="note updating">Updating for the new date or place…</p>}
      {ev && (
        <>
          <p className="score">
            <i style={{ background: metricColor(ev.score.value) }} />
            Score <strong>{ev.score.value?.toFixed(2) ?? 'n/a'}</strong>
            {ev.score.uncertainty != null && ev.score.uncertainty >= 0.005 ? <span className="unc">± {ev.score.uncertainty.toFixed(2)}</span> : null}
            {hasLimits
              ? <span className={ev.feasible ? 'ok' : 'bad'}>{!ev.feasible ? 'breaks a requirement' : ev.not_checked.length ? 'meets the checked requirements' : 'meets all requirements'}</span>
              : <span className="nolimits">no requirements set</span>}
          </p>
          {ev.violations.length > 0 && (
            <ul className="violations">{ev.violations.map((x) => <li key={x.limit}>{describeViolation(x)}</li>)}</ul>
          )}
          {(ev.requirements_at_risk?.length ?? 0) > 0 && (
            <p className="at-risk">
              At risk: {ev.requirements_at_risk!.map(limitLabel).join(', ')}. Met at this exact point but broken
              {pos ? ` within ${pos} m` : ' within the landing uncertainty'} or within the horizon accuracy.
            </p>
          )}
          {ev.not_checked.length > 0 && <p className="note">Not checked, data missing on the server: {ev.not_checked.map(limitLabel).join(', ')}</p>}
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
            <div><dt>Sunlight</dt><dd>{u('sunlit_frac', fmtPct, [0, 1])}</dd></div>
            <div><dt>Longest night</dt><dd>{u('longest_dark_h', fmtH, [0, ev.window.duration_h])}</dd></div>
            <div><dt>First sunset after landing</dt><dd>{untilLoss(v('hours_to_first_dark_h'), 'dark at landing')}</dd></div>
            <div><dt>Mean Sun elevation when lit</dt><dd>{u('mean_sun_el_when_lit_deg', fmtDeg)}</dd></div>
            <div><dt>Earth in view</dt><dd>{u('earth_visible_frac', fmtPct, [0, 1])}</dd></div>
            <div><dt>Longest blackout</dt><dd>{u('longest_no_earth_h', fmtH, [0, ev.window.duration_h])}</dd></div>
            <div><dt>First Earthset after landing</dt><dd>{untilLoss(v('hours_to_first_earth_loss_h'), 'no Earth at landing')}</dd></div>
            <div><dt>Slope{ev.terrain?.slope_baseline_m ? ` (over ${Math.round(ev.terrain.slope_baseline_m)} m)` : ''}</dt><dd>{u('slope_deg', fmtDeg, [0, 90])}</dd></div>
            <div><dt>Elevation (LOLA)</dt><dd>{fmtM(p?.elevation_m)}</dd></div>
            {v('lola_mean_sun_visibility_frac') != null && (
              <div><dt>NASA long-term Sun visibility</dt><dd>{fmtPct(v('lola_mean_sun_visibility_frac'))}</dd></div>
            )}
            {v('lola_mean_earth_visibility_frac') != null && (
              <div><dt>NASA long-term Earth visibility</dt><dd>{fmtPct(v('lola_mean_earth_visibility_frac'))}</dd></div>
            )}
          </dl>
          {ev.terrain_available
            ? <p className="note">
                Horizon, slope and elevation from LOLA{ev.terrain?.dem_product ? ` (${ev.terrain.dem_product}` : ''}
                {ev.terrain?.dem_resolution_m ? `, ${ev.terrain.dem_resolution_m} m` : ''}{ev.terrain?.dem_product ? ')' : ''}.
                {ev.terrain?.slope_source ? ` Slope: ${ev.terrain.slope_source}.` : ''} NASA long-term values (LOLA AVGVISIB, south of 85° S) are for context.
              </p>
            : <p className="error-inline">
                The analysis server has no LOLA maps, so hills are ignored (smooth sphere) and these numbers are optimistic.
                Run <code>python -m analysis.download_maps</code> on the server.
              </p>}
        </>
      )}
      {radiusKm > 0 && (
        <div className="nearby">
          <h3>Within {radiusKm} km</h3>
          {areaError && <p className="error-inline">{areaError}</p>}
          {areaLoading && <p className="note updating">{area ? 'Updating…' : 'Searching…'}</p>}
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
