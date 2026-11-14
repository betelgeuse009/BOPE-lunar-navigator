import { useState } from 'react'
import { cellValue } from '../data/load'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { goodness } from './metrics'
import { landingType } from './sites'

const ROBOTIC_PREVIEW = 8

// Known landing sites, grouped crewed / robotic. Choosing one is the same as clicking it on the globe: it becomes the
// chosen place (pink, like the globe target), it is evaluated live with the user's settings, and the globe turns to it.
export function Catalogue({ sites, matrix }: { sites: Site[]; matrix: Matrix }) {
  const [allRobotic, setAllRobotic] = useState(false)
  const crewed = sites.filter((s) => landingType(s) === 'crewed')
  const robotic = sites.filter((s) => landingType(s) === 'robotic')
  const shownRobotic = allRobotic ? robotic : robotic.slice(0, ROBOTIC_PREVIEW)

  return (
    <div className="catalogue">
      <Group title="Crewed landings" sites={crewed} matrix={matrix} />
      <Group title="Robotic landers" sites={shownRobotic} matrix={matrix} />
      {robotic.length > ROBOTIC_PREVIEW && (
        <button type="button" className="text-button" onClick={() => setAllRobotic(!allRobotic)}>
          {allRobotic ? 'Show fewer' : `Show all ${robotic.length} robotic landers`}
        </button>
      )}
    </div>
  )
}

function Group({ title, sites, matrix }: { title: string; sites: Site[]; matrix: Matrix }) {
  const { selectedSite, setSelected, setHovered, setPoint, mode, dateIdx, metric } = useApp()
  const choose = (s: Site) => {
    setSelected(s.id)
    if (mode === 'live') setPoint({ lat: s.lat_deg, lon: s.lon_deg })
  }
  return (
    <section className="site-group">
      <h3>{title}</h3>
      <ul className="site-list">
        {sites.map((s) => {
          const v = goodness(cellValue(matrix, s.id, metric, dateIdx), metric, matrix.mission_duration_h)
          const chosen = s.id === selectedSite
          return (
            <li key={s.id}>
              <button type="button" className={`site-row${chosen ? ' chosen' : ''}`} aria-pressed={chosen}
                onClick={() => choose(s)} onMouseEnter={() => setHovered(s.id)} onMouseLeave={() => setHovered(null)}>
                <i className="dot" style={{ background: metricColor(v) }} aria-hidden />
                <span className="site-name">{s.name}</span>
                <span className="site-year">{s.mission_date?.slice(0, 4)}</span>
                <span className="site-sub">
                  {[s.agency, s.status && s.status !== 'landed' ? s.status : null].filter(Boolean).join(', ')}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
