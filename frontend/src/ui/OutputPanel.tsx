import type { Area, Evaluation } from '../data/api'
import type { Matrix, Site } from '../data/schemas'
import { useEphemeris, useWindows } from '../data/useLive'
import { useApp } from '../state/store'
import { PinButton } from './ComparePanel'
import { fmtCoords, fmtM } from './format'
import { Help } from './Help'
import { Block } from './Pane'
import { EarthBlock, NearbyBlock, ScoreBlock, SunBlock, TerrainBlock } from './results/blocks'
import { TimePlot } from './results/TimePlot'
import { SitePanel } from './SitePanel'

type Request<T> = { data: T | null; loading: boolean; error: string | null }
const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

// Right pane: results for the chosen place. It reads the store and the server's answers and sets nothing.
// On top: where and when. Below: one block per subject, then the plot and the catalogue record.
export function OutputPanel({ sites, matrix, ev, area, landingUtc }: {
  sites: Site[]; matrix: Matrix; ev: Request<Evaluation>; area: Request<Area>; landingUtc: string | undefined
}) {
  const { point, mode, radiusKm, setPoint } = useApp()
  const eph = useEphemeris(landingUtc)
  const windows = useWindows(landingUtc)
  const e = ev.data
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
          <Block title="Score and requirements" help="score"><ScoreBlock ev={e} /></Block>
          <Block title="Sun" help="sunlight" open={false}><SunBlock ev={e} eph={eph.data} windows={windows.data} /></Block>
          <Block title="Earth" help="earth-in-view" open={false}><EarthBlock ev={e} eph={eph.data} windows={windows.data} /></Block>
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
