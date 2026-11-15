import { limitsQuery, type Area, type Ephemeris, type Evaluation, type Windows } from '../../data/api'
import { useApp } from '../../state/store'
import { metricColor } from '../colors'
import { FACTORS } from '../factors'
import { fmtDeg, fmtH, fmtM, fmtPct, fmtUnc, untilLoss } from '../format'
import { Help } from '../Help'
import { describeViolation, limitLabel } from '../profiles'
import { durationH, fmtDuration, repeatPeriod } from './periods'
import { Row, Rows } from './Rows'
import { REPEAT_DAYS } from '../../data/useLive'

// The blocks of the Results pane, one per subject. Each only formats what the analysis server sent.
type P = { ev: Evaluation; eph: Ephemeris | null; windows: Windows | null; repeat: Windows | null }
const NA = 'n/a'
const first = (s: number[] | undefined) => s?.[0]
const num = (v: number | null | undefined, f: (x: number) => string) => (v == null ? NA : f(v))
// Right ascension in hours, minutes, seconds (and degrees); declination in signed degrees.
const fmtRa = (d: number) => {
  const s = Math.round((d / 15) * 3600), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s (${d.toFixed(3)}°)`
}
const fmtDec = (d: number) => `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(3)}°`
const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

function useValues(ev: Evaluation) {
  const p = ev.parameters
  return {
    v: (k: string) => p[k]?.value ?? null,
    // Value ± uncertainty, or the range found when ± would cross a physical limit (contracts/API.md).
    u: (k: string, fmt: (x: number) => string, bounds?: [number, number]) => {
      const c = p[k]
      return c?.value == null ? NA : fmtUnc(fmt, c.value, c.uncertainty, ev.uncertainty_model?.components?.[k]?.range, bounds)
    },
    has: (k: string) => k in p,
  }
}

export function ScoreBlock({ ev }: { ev: Evaluation }) {
  const settings = useApp((s) => s.settings)
  const hasLimits = Object.keys(limitsQuery(settings)).length > 0
  const pos = ev.uncertainty_model?.position_uncertainty_m
  const comps = ev.score.components
  return (
    <>
      <p className="score">
        <i style={{ background: metricColor(ev.score.value) }} />
        <strong>{ev.score.value?.toFixed(2) ?? NA}</strong>
        {ev.score.uncertainty != null && ev.score.uncertainty >= 0.005 ? <span className="unc">± {ev.score.uncertainty.toFixed(2)}</span> : null}
        <Help topic="score" />
        {hasLimits
          ? <span className={ev.feasible ? 'ok' : 'bad'}>{!ev.feasible ? 'breaks a requirement' : ev.not_checked.length ? 'meets the checked requirements' : 'meets all requirements'}</span>
          : <span className="nolimits">no requirements set</span>}
        <Help topic="verdict" />
      </p>
      {ev.violations.length > 0 && (
        <ul className="violations">{ev.violations.map((x) => <li key={x.limit}>{describeViolation(x)}</li>)}</ul>
      )}
      {(ev.requirements_at_risk?.length ?? 0) > 0 && (
        <p className="at-risk">
          At risk <Help topic="uncertainty" />: {ev.requirements_at_risk!.map(limitLabel).join(', ')}. Met at this exact point but broken
          {pos ? ` within ${pos} m` : ' within the landing uncertainty'} or within the horizon accuracy.
        </p>
      )}
      {ev.not_checked.length > 0 && <p className="note">Not checked, data missing on the server: {ev.not_checked.map(limitLabel).join(', ')}</p>}
      <table className="breakdown">
        <thead><tr><th>Factor</th><th>Sub-score</th><th>Weight</th></tr></thead>
        <tbody>
          {FACTORS.map((f) => (
            <tr key={f.key}>
              <td>{f.label} <Help topic={f.help} /></td>
              <td>{comps[f.api]?.score?.toFixed(2) ?? NA}</td>
              <td>{comps[f.api]?.weight ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// The periods a body is in view during the stay, as the server lists them, each with its length; then how often the
// periods come back, measured over REPEAT_DAYS from the landing (`repeat`, the same list over a longer window).
function Periods({ title, list, repeat, startUtc }: {
  title: string; list: Windows['sun_windows'] | undefined; repeat: Windows['sun_windows'] | undefined; startUtc: string
}) {
  const r = repeat && repeatPeriod(repeat, startUtc, REPEAT_DAYS)
  return (
    <>
      <h3 className="rows-title">{title} <Help topic="visibility-windows" /></h3>
      {!list ? <p className="note">{NA}</p> : list.length === 0 ? <p className="note">Never during the stay.</p> : (
        <ol className="periods">
          {list.slice(0, 8).map((w) => (
            <li key={w.start_utc}>
              {whenFmt.format(new Date(w.start_utc))} <span>to</span> {whenFmt.format(new Date(w.end_utc))}
              <span className="dur"> · {fmtDuration(durationH(w))}</span>
            </li>
          ))}
          {list.length > 8 && <li className="more">and {list.length - 8} more (all in the CSV as visible part of the disc)</li>}
        </ol>
      )}
      <Rows>
        <Row label="Repeats every" help="visibility-windows">
          {!repeat ? '…' : r ? `${r.days.toFixed(1)} days`
            : repeat.length === 0 ? `never in view within ${REPEAT_DAYS} days`
            : repeat.length === 1 && Date.parse(repeat[0].start_utc) <= Date.parse(startUtc) && Date.parse(repeat[0].end_utc) >= Date.parse(startUtc) + (REPEAT_DAYS * 24 - 1) * 3_600_000
              ? `in view for all ${REPEAT_DAYS} days` : `no regular cycle within ${REPEAT_DAYS} days`}
        </Row>
      </Rows>
    </>
  )
}

export function SunBlock({ ev, eph, windows, repeat }: P) {
  const { v, u, has } = useValues(ev)
  return (
    <>
      <Rows title="At landing">
        <Row label="Elevation" help="sun-position">{num(first(eph?.sun_el_deg), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Azimuth" help="sun-position">{num(first(eph?.sun_az_deg), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Visible part of the disc" help="sunlight">{num(first(eph?.sun_visible_frac), fmtPct)}</Row>
        <Row label="Distance" help="sun-position">{num(first(eph?.sun_dist_km), (x) => `${(x / 1e6).toFixed(3)} million km`)}</Row>
        <Row label="Angular radius" help="sun-position">{num(first(eph?.sun_radius_deg), (x) => `${x.toFixed(4)}°`)}</Row>
        <Row label="Right ascension" help="ra-dec">{num(first(eph?.sun_ra_deg), fmtRa)}</Row>
        <Row label="Declination" help="ra-dec">{num(first(eph?.sun_dec_deg), fmtDec)}</Row>
      </Rows>
      <Rows title="Over the stay">
        <Row label="Sunlight" help="sunlight">{u('sunlit_frac', fmtPct, [0, 1])}</Row>
        <Row label="Longest night" help="longest-night">{u('longest_dark_h', fmtH, [0, ev.window.duration_h])}</Row>
        <Row label="First sunset" help="countdowns">{untilLoss(v('hours_to_first_dark_h'), 'dark at landing')}</Row>
        {has('hours_to_first_sun_h') && <Row label="First sunrise" help="countdowns">{untilLoss(v('hours_to_first_sun_h'), 'sunlit at landing')}</Row>}
        <Row label="Mean elevation when lit" help="sun-elevation">{u('mean_sun_el_when_lit_deg', fmtDeg)}</Row>
        <Row label="Lowest elevation" help="sun-position">{num(v('sun_el_min_deg'), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Highest elevation" help="sun-position">{num(v('sun_el_max_deg'), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Mean irradiance" help="solar-energy">{u('mean_irradiance_w_m2', (x) => `${Math.round(x)} W/m²`)}</Row>
        <Row label="Energy on a Sun-tracking surface" help="solar-energy">{u('sun_energy_tracking_kwh_m2', (x) => `${x.toFixed(1)} kWh/m²`)}</Row>
        {v('lola_mean_sun_visibility_frac') != null && <Row label="NASA long-term visibility" help="nasa-visibility">{fmtPct(v('lola_mean_sun_visibility_frac'))}</Row>}
      </Rows>
      <Periods title="Sunlit periods" list={windows?.sun_windows} repeat={repeat?.sun_windows} startUtc={ev.window.start_utc} />
    </>
  )
}

export function EarthBlock({ ev, eph, windows, repeat }: P) {
  const { v, u, has } = useValues(ev)
  return (
    <>
      <Rows title="At landing">
        <Row label="Elevation" help="earth-position">{num(first(eph?.earth_el_deg), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Azimuth" help="earth-position">{num(first(eph?.earth_az_deg), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Visible part of the disc" help="earth-in-view">{num(first(eph?.earth_visible_frac), fmtPct)}</Row>
        <Row label="Distance" help="earth-position">{num(first(eph?.earth_dist_km), (x) => `${Math.round(x).toLocaleString('en-GB')} km`)}</Row>
        <Row label="Angular radius" help="earth-position">{num(first(eph?.earth_radius_deg), (x) => `${x.toFixed(4)}°`)}</Row>
        <Row label="Illuminated part (phase)" help="earth-position">{num(first(eph?.earth_phase_frac), fmtPct)}</Row>
        <Row label="Right ascension" help="ra-dec">{num(first(eph?.earth_ra_deg), fmtRa)}</Row>
        <Row label="Declination" help="ra-dec">{num(first(eph?.earth_dec_deg), fmtDec)}</Row>
      </Rows>
      <Rows title="Over the stay">
        <Row label="Earth in view" help="earth-in-view">{u('earth_visible_frac', fmtPct, [0, 1])}</Row>
        <Row label="Longest blackout" help="longest-blackout">{u('longest_no_earth_h', fmtH, [0, ev.window.duration_h])}</Row>
        <Row label="First Earthset" help="countdowns">{untilLoss(v('hours_to_first_earth_loss_h'), 'no Earth at landing')}</Row>
        {has('hours_to_first_earth_h') && <Row label="First Earthrise" help="countdowns">{untilLoss(v('hours_to_first_earth_h'), 'in view at landing')}</Row>}
        <Row label="Mean elevation when in view" help="earth-position">{u('mean_earth_el_when_visible_deg', fmtDeg)}</Row>
        <Row label="Lowest elevation" help="earth-position">{num(v('earth_el_min_deg'), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Highest elevation" help="earth-position">{num(v('earth_el_max_deg'), (x) => `${x.toFixed(2)}°`)}</Row>
        <Row label="Sunlight and Earth together" help="both-in-view">{u('both_frac', fmtPct, [0, 1])}</Row>
        {v('lola_mean_earth_visibility_frac') != null && <Row label="NASA long-term visibility" help="nasa-visibility">{fmtPct(v('lola_mean_earth_visibility_frac'))}</Row>}
      </Rows>
      <Periods title="Periods with Earth in view" list={windows?.earth_windows} repeat={repeat?.earth_windows} startUtc={ev.window.start_utc} />
    </>
  )
}

const HORIZON: Record<string, string> = { 'lola-terrain': 'LOLA terrain', 'smooth-sphere': 'smooth sphere (no terrain)' }

export function TerrainBlock({ ev }: { ev: Evaluation }) {
  const { u } = useValues(ev)
  const t = ev.terrain
  return (
    <>
      <Rows>
        <Row label={`Slope${t?.slope_baseline_m ? ` over ${Math.round(t.slope_baseline_m)} m` : ''}`} help="slope">{u('slope_deg', fmtDeg, [0, 90])}</Row>
        <Row label="Altitude" help="elevation">{fmtM(ev.parameters.elevation_m)}</Row>
        <Row label="Horizon used" help="terrain-horizon">{HORIZON[ev.horizon_source] ?? ev.horizon_source}</Row>
        {t?.dem_product && <Row label="Altitude map" help="elevation">{t.dem_product}{t.dem_resolution_m ? `, ${t.dem_resolution_m} m` : ''}</Row>}
        {t?.slope_source && <Row label="Slope source" help="slope">{t.slope_source}</Row>}
        {t?.height_error_m != null && <Row label="Map height error" help="elevation">{t.height_error_m.toFixed(2)} m</Row>}
      </Rows>
      {!ev.terrain_available && (
        <p className="error-inline">
          The analysis server has no LOLA maps, so hills are ignored (smooth sphere) and the Sun and Earth numbers are optimistic.
          Run <code>python -m analysis.download_maps</code> on the server.
        </p>
      )}
    </>
  )
}

export function NearbyBlock({ area, loading, error }: { area: Area | null; loading: boolean; error: string | null }) {
  return (
    <div className="nearby">
      {error && <p className="error-inline">{error}</p>}
      {loading && <p className="note updating">{area ? 'Updating…' : 'Searching…'}</p>}
      {area && (
        <Rows>
          <Row label="Best point" help="nearby-search">
            {area.center_is_best || !area.best ? 'the chosen place' : `${area.best.dist_km.toFixed(1)} km away, bearing ${Math.round(area.best.bearing_deg)}°`}
          </Row>
          {area.best && !area.center_is_best && <Row label="Its score" help="score">{area.best.score?.toFixed(3)} (+{area.best.score_gain?.toFixed(3)})</Row>}
          <Row label="Scores in the area" help="nearby-search">{area.score_range[0].toFixed(3)} to {area.score_range[1].toFixed(3)}</Row>
        </Rows>
      )}
    </div>
  )
}
