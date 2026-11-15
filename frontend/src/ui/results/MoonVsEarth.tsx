import type { Ephemeris, Evaluation } from '../../data/api'
import { Help } from '../Help'

// Moon vs Earth: the chosen place next to everyday Earth values, as paired bars on a linear scale (the longer of the
// two fills the row), so the size of the differences shows as it is. Earth and general Moon values: NASA fact sheets
// (topic "moon-vs-earth"); values marked "here" come from the server for this place and stay.
const C_KM_S = 299_792.458                     // speed of light, exact (SI)
const MOON_FROM_EARTH_DEG = 2 * Math.atan(1737.4 / 384_400) * 180 / Math.PI // 0.52°, mean radius and distance (fact sheet)

type Pair = { label: string; moon: number; earth: number; moonText: string; earthText: string; note?: string }

export function MoonVsEarth({ ev, eph }: { ev: Evaluation; eph: Ephemeris | null }) {
  const p = ev.parameters
  const night = p.longest_dark_h?.value, sunMax = p.sun_el_max_deg?.value
  const earthKm = eph?.earth_dist_km?.[0], earthR = eph?.earth_radius_deg?.[0]
  const rows: Pair[] = [
    { label: 'Day and night, one full cycle', moon: 29.53 * 24, earth: 24, moonText: '29.5 days', earthText: '24 h' },
    ...(night != null ? [{ label: 'Longest night of your stay (here)', moon: night, earth: 12, moonText: night === 0 ? 'none' : `${Math.round(night)} h`,
      earthText: 'about 12 h', note: 'Earth: half of a 24 h day at the equator' }] : []),
    { label: 'Ground temperature swing in a day', moon: 390 - 95, earth: 293 - 283, moonText: '295 K (95 to 390 K)', earthText: '10 K (283 to 293 K)',
      note: 'Moon: equator; Earth: global average day' },
    ...(sunMax != null ? [{ label: 'Highest Sun during your stay (here)', moon: Math.max(sunMax, 0), earth: 90, moonText: `${sunMax.toFixed(1)}°`,
      earthText: 'up to 90°', note: 'Earth: noon at the equator at the equinox' }] : []),
    { label: 'Air pressure at the ground', moon: 3e-15, earth: 1.014, moonText: '0.000 000 000 000 003 bar', earthText: '1.014 bar',
      note: 'No air: black sky in full daylight, no wind, no sound, hard shadows' },
    { label: 'Gravity', moon: 1.62, earth: 9.8, moonText: '1.62 m/s²', earthText: '9.80 m/s²' },
    ...(earthR != null ? [{ label: 'Size in the sky (here)', moon: 2 * earthR, earth: MOON_FROM_EARTH_DEG, moonText: `Earth ${(2 * earthR).toFixed(2)}° wide`,
      earthText: `Moon ${MOON_FROM_EARTH_DEG.toFixed(2)}° wide`, note: 'Earth seen from here vs the Moon seen from Earth' }] : []),
  ]
  return (
    <>
      <p className="vs-key"><i className="m" />Moon (this place where marked "here") <i className="e" />Earth <Help topic="moon-vs-earth" /></p>
      <ul className="vs">
        {rows.map((r) => {
          const max = Math.max(r.moon, r.earth), ratio = r.moon / r.earth
          return (
            <li key={r.label}>
              <span className="vs-label">{r.label}</span>
              <span className="vs-ratio">{fmtRatio(ratio)}</span>
              <span className="vs-bar m"><i style={{ width: `${(r.moon / max) * 100}%` }} /><b>{r.moonText}</b></span>
              <span className="vs-bar e"><i style={{ width: `${(r.earth / max) * 100}%` }} /><b>{r.earthText}</b></span>
              {r.note && <small>{r.note}</small>}
            </li>
          )
        })}
      </ul>
      {earthKm != null && (
        <p className="note">Radio signal to Earth from here: {(earthKm / C_KM_S).toFixed(2)} s one way, {(2 * earthKm / C_KM_S).toFixed(2)} s there and back
          (distance {Math.round(earthKm).toLocaleString('en-GB')} km at landing, speed of light).</p>
      )}
    </>
  )
}

// "× 29.5", "× 0.17", "10¹⁴ × less".
function fmtRatio(r: number): string {
  if (r === 0) return '—'
  if (r >= 0.01 && r < 1000) return `× ${r >= 100 ? r.toFixed(0) : r.toFixed(r < 1 ? 2 : 1)}`
  const e = Math.round(Math.log10(r < 1 ? 1 / r : r))
  const sup = String(e).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('')
  return r < 1 ? `10${sup} × less` : `10${sup} × more`
}
