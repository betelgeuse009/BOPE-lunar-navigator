import type { Area, Evaluation } from '../data/api'
import type { Matrix, Site } from '../data/schemas'
import { useEphemeris, useRepeatWindows, useWindows } from '../data/useLive'
import { useApp } from '../state/store'
import { PinButton } from './ComparePanel'
import { fmtCoords, fmtDeg, fmtH_cm, fmtK, fmtM, fmtRock } from './format'
import type { TopicId } from '../docs/topics'
import { Help } from './Help'
import { Block } from './Pane'
import { EarthBlock, NearbyBlock, ScoreBlock, SunBlock, TerrainBlock } from './results/blocks'
import { useWarn } from './useWarn'
import { Status, StatusLegend } from './Status'
import { Countdown } from './results/Countdown'
import type { Verdict } from './warnings'
import { TimePlot } from './results/TimePlot'
import { SitePanel } from './SitePanel'

type Request<T> = { data: T | null; loading: boolean; error: string | null }

// One value under the coordinates, in the same format as the altitude: label with its help mark, then the value.
function Fact({ label, help, e, k, fmt, missing = 'n/a', status }: {
  label: string; help: TopicId; e: Evaluation | null; k: string; fmt: (v: number) => string; missing?: string; status?: Verdict | null
}) {
  const v = e?.parameters[k]?.value
  return <div className={status ? `level-${status.level}` : undefined}><dt>{label} <Help topic={help} /></dt><dd>{!e ? '…' : v == null ? missing : fmt(v)}<Status v={status} /></dd></div>
}
const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

// Right pane: results for the chosen place. It reads the store and the server's answers and sets nothing.
// On top: where and when. Below: one block per subject, then the plot and the catalogue record.
export function OutputPanel({ sites, matrix, ev, area, landingUtc }: {
  sites: Site[]; matrix: Matrix; ev: Request<Evaluation>; area: Request<Area>; landingUtc: string | undefined
}) {
  const { point, mode, radiusKm, setPoint } = useApp()
  const eph = useEphemeris(landingUtc)
  const windows = useWindows(landingUtc)
  const repeat = useRepeatWindows(landingUtc)
  const e = ev.data
  const warn = useWarn(e)
  return (
    <>
      {point ? (
        <header className={`place${ev.loading ? ' stale' : ''}`} aria-busy={ev.loading}>
          <div className="panel-head">
            <h2>{fmtCoords(point.lat, point.lon)}</h2>
            <button type="button" className="close" onClick={() => setPoint(null)} aria-label="Clear the chosen place">×</button>
          </div>
          <dl className="place-facts">
            <div><dt>Altitude <Help topic="elevation" /></dt><dd>{e ? fmtM(e.parameters.elevation_m) : '…'}</dd></div>
            <div><dt>Landing <Help topic="landing-time" /></dt><dd>{landingUtc ? `${whenFmt.format(new Date(landingUtc))} UTC` : 'n/a'}</dd></div>
            <Fact label="Slope" help="slope" e={e} k="slope_deg" fmt={(v) => {
              const u = e?.parameters.slope_deg?.uncertainty, b = e?.terrain?.slope_baseline_m
              return `${fmtDeg(v)}${u != null && u >= 0.05 ? ` ± ${u.toFixed(1)}°` : ''}${b ? ` over ${Math.round(b)} m` : ''}`
            }} status={warn('slope_deg')} />
            <Fact label="Rock abundance" help="rock-abundance" e={e} k="rock_abundance_frac" fmt={fmtRock} missing="not mapped beyond 80°" status={warn('rock_abundance_frac')} />
            <Fact label="Surface temp., max" help="surface-temperature" e={e} k="surface_temp_max_k" fmt={fmtK} status={warn('surface_temp_max_k')} />
            <Fact label="Surface temp., average" help="surface-temperature" e={e} k="surface_temp_avg_k" fmt={fmtK} />
            <Fact label="H-parameter (thermal inertia)" help="h-parameter" e={e} k="h_parameter_m" fmt={fmtH_cm} missing="not mapped beyond 70°" />
          </dl>
          <PinButton label={`Point ${fmtCoords(point.lat, point.lon)}`} lat={point.lat} lon={point.lon} />
          {ev.error && <p className="error-inline">{ev.error}</p>}
          {ev.loading && <p className="note updating">{e ? 'Updating for the new date or place…' : 'Computing…'}</p>}
        </header>
      ) : (
        <p className="note place-empty">{mode === 'live' ? 'Choose a known landing site or click anywhere on the Moon.' : 'Needs the analysis server (live mode).'}</p>
      )}
      {point && e && (
        <div className={ev.loading ? 'stale' : undefined}>
          <StatusLegend />
          <Countdown ev={e} windows={windows.data} />
          <Block title="Score and requirements" help="score"><ScoreBlock ev={e} /></Block>
          <Block title="Sun" help="sunlight" open={false}><SunBlock ev={e} eph={eph.data} windows={windows.data} repeat={repeat.data} /></Block>
          <Block title="Earth" help="earth-in-view" open={false}><EarthBlock ev={e} eph={eph.data} windows={windows.data} repeat={repeat.data} /></Block>
          <Block title="Terrain" help="slope" open={false}><TerrainBlock ev={e} /></Block>
          {radiusKm > 0 && <Block title={`Within ${radiusKm} km`} help="nearby-search"><NearbyBlock area={area.data} loading={area.loading} error={area.error} /></Block>}
          <Block title="Plot over time" help="time-series" open={false}><TimePlot data={eph.data} loading={eph.loading} error={eph.error} /></Block>
        </div>
      )}
      <Block title="Site record" help="site-record" open={false}>
        <SitePanel sites={sites} matrix={matrix} />
      </Block>
    </>
  )
}
