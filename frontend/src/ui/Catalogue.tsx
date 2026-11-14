import { useState } from 'react'
import { cellValue } from '../data/load'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { goodness } from './metrics'
import { landingType } from './sites'

type Filter = 'all' | 'crewed' | 'robotic'

// Known landing sites as cards. Choosing one is the same as clicking it on the globe: it becomes the chosen place
// (evaluated live with the user's settings) and the globe turns to it.
export function Catalogue({ sites, matrix }: { sites: Site[]; matrix: Matrix }) {
  const { selectedSite, setSelected, setHovered, setPoint, mode, dateIdx, metric } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const count = (f: Filter) => sites.filter((s) => f === 'all' || landingType(s) === f).length
  const shown = sites.filter((s) => filter === 'all' || landingType(s) === filter)
  const choose = (s: Site) => {
    setSelected(s.id)
    if (mode === 'live') setPoint({ lat: s.lat_deg, lon: s.lon_deg })
  }

  return (
    <div className="catalogue">
      <div className="chips" role="radiogroup" aria-label="Landing type">
        {(['all', 'crewed', 'robotic'] as Filter[]).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} className={filter === f ? 'on' : ''}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'crewed' ? 'Crewed' : 'Robotic'} ({count(f)})
          </button>
        ))}
      </div>
      <ul className="cards">
        {shown.map((s) => {
          const v = goodness(cellValue(matrix, s.id, metric, dateIdx), metric, matrix.mission_duration_h)
          return (
            <li key={s.id}>
              <button type="button" className={`card${s.id === selectedSite ? ' on' : ''}`} aria-pressed={s.id === selectedSite}
                onClick={() => choose(s)} onMouseEnter={() => setHovered(s.id)} onMouseLeave={() => setHovered(null)}>
                <span className="card-name"><i style={{ background: metricColor(v) }} />{s.name}</span>
                <span className="card-meta">
                  {landingType(s) === 'crewed' ? 'Crewed' : 'Robotic'}
                  {s.agency ? ` · ${s.agency}` : ''}{s.mission_date ? ` · ${s.mission_date.slice(0, 4)}` : ''}
                  {s.status && s.status !== 'landed' ? ` · ${s.status}` : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
