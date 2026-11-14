import { cellValue } from '../data/load'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { PinButton } from './ComparePanel'
import { fmtCoords } from './format'
import { formatValue, goodness, metricMeta } from './metrics'
import { landingType } from './sites'

export function SitePanel({ sites, matrix }: { sites: Site[]; matrix: Matrix }) {
  const { hoveredSite, selectedSite, dateIdx, metric } = useApp()
  const site = sites.find((s) => s.id === (hoveredSite ?? selectedSite))
  if (!site) return <aside className="panel panel-empty">Point at a site to see its numbers. With live analysis on, click any place on the Moon to evaluate it.</aside>
  const fields = Object.keys(matrix.cells)
  return (
    <aside className="panel">
      <h2>{site.name}</h2>
      <p className="coords">{fmtCoords(site.lat_deg, site.lon_deg)}{site.is_region ? ' (centre of a region)' : ''}</p>
      <p className="site-meta">
        <span className={`type type-${landingType(site)}`}>{landingType(site) === 'crewed' ? 'Crewed' : 'Robotic'}</span>
        {[site.agency, site.status, site.mission_date].filter(Boolean).join(' · ')}
      </p>
      {site.description && <p className="note site-desc">{site.description}</p>}
      <PinButton label={site.name} lat={site.lat_deg} lon={site.lon_deg} siteId={site.id} />
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
        {site.slope_deg != null && (
          <div><dt>Slope (LOLA{site.slope_baseline_m ? `, over ${Math.round(site.slope_baseline_m)} m` : ''})</dt><dd>{site.slope_deg.toFixed(1)}°</dd></div>
        )}
        {site.elevation_m != null && <div><dt>Elevation (LOLA)</dt><dd>{site.elevation_m.toFixed(0)} m</dd></div>}
      </dl>
      <p className="note">Uncertainty: {matrix.uncertainty_notes ?? 'not stated in the data file.'}</p>
      <p className="note">
        Coordinates from {site.coord_source}
        {site.coord_source_url && <> (<a href={site.coord_source_url} target="_blank" rel="noreferrer">source</a>)</>}
      </p>
    </aside>
  )
}
