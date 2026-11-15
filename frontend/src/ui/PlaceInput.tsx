import { useState, type FormEvent } from 'react'
import { useApp, type Point } from '../state/store'
import { parsePlace } from './place'
import { Help } from './Help'

// Place block: type the coordinates of the place to evaluate instead of clicking the Moon.
export function PlaceInput() {
  const point = useApp((s) => s.point)
  // A new place chosen elsewhere (click, catalogue) refills the boxes.
  return <PlaceForm key={point ? `${point.lat},${point.lon}` : 'none'} point={point} />
}

function PlaceForm({ point }: { point: Point | null }) {
  const { mode, setPoint, setSelected } = useApp()
  const [lat, setLat] = useState(point ? point.lat.toFixed(4) : '')
  const [lon, setLon] = useState(point ? point.lon.toFixed(4) : '')
  const [error, setError] = useState<string | null>(null)
  const live = mode === 'live'
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const p = parsePlace(lat, lon)
    if (typeof p === 'string') return setError(p)
    setError(null)
    setSelected(null)
    setPoint(p)
  }
  return (
    <form className="place-input" onSubmit={submit}>
      <fieldset disabled={!live}>
        <legend>Coordinates <Help topic="coordinates" /></legend>
        <label>
          <span>Latitude</span>
          <input type="text" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="−89.45" aria-describedby="place-hint" />
          <span className="unit">° N</span>
        </label>
        <label>
          <span>Longitude</span>
          <input type="text" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="−137.31" aria-describedby="place-hint" />
          <span className="unit">° E</span>
        </label>
        <button type="submit">Go</button>
      </fieldset>
      <p id="place-hint" className="note">
        {!live ? 'Needs the analysis server (live mode).' : error ?? 'Decimal degrees. South and west are negative.'}
      </p>
    </form>
  )
}
