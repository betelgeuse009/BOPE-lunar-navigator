import { cellValue } from '../data/load'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { formatValue, goodness, metricMeta } from './metrics'

export function SitePanel({ sites, matrix }: { sites: Site[]; matrix: Matrix }) {
  const { hoveredSite, selectedSite, dateIdx, metric } = useApp()
  const site = sites.find((s) => s.id === (hoveredSite ?? selectedSite))
  if (!site) return <aside className="panel panel-empty">Point at a site to see its numbers. With live analysis on, click any place on the Moon to evaluate it.</aside>
  const fields = Object.keys(matrix.cells)
  return (
    <aside className="panel">
      <h2>{site.name}</h2>
      <p className="coords">
        {Math.abs(site.lat_deg).toFixed(2)}° {site.lat_deg < 0 ? 'S' : 'N'}, {Math.abs(site.lon_deg).toFixed(2)}° {site.lon_deg < 0 ? 'W' : 'E'}
      </p>
      <dl>
        {fields.map((f) => {
          const v = cellValue(matrix, site.id, f, dateIdx)
          return (
            <div key={f} className={f === metric ? 'current' : ''}>
              <dt>
                <i style={{ background: metricColor(goodness(v, f, matrix.mission_duration_h)) }} />
                {metricMeta(f).label}
              </dt>
              <dd>{formatValue(v, f)}</dd>
            </div>
          )
        })}
      </dl>
      <p className="note">Uncertainty: {matrix.uncertainty_notes ?? 'not stated in the data file.'}</p>
      <p className="note">Coordinates from {site.coord_source}</p>
    </aside>
  )
}
