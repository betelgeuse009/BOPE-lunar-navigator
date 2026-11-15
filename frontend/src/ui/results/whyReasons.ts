// "Why it changes" (ui/results/Why.tsx): reads the server's Sun / Earth tracks and the terrain skyline and says what
// limits the place. Only comparisons of server values; nothing physical is computed here.

// Smallest arc of the compass (degrees) that holds every azimuth: [start, end], going clockwise; end may be < start
// when the arc crosses north.
export function circularSpan(az: number[]): [number, number] | null {
  if (!az.length) return null
  const s = [...new Set(az.map((a) => ((a % 360) + 360) % 360))].sort((a, b) => a - b)
  if (s.length === 1) return [s[0], s[0]]
  let gap = 360 - s[s.length - 1] + s[0], at = 0 // the gap across north, ending at s[0]
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] > gap) { gap = s[i] - s[i - 1]; at = i }
  return [s[at], s[(at - 1 + s.length) % s.length]]
}

// Skyline elevation at an azimuth, linear between the server's samples (0.5° apart, periodic).
export function skylineAt(azGrid: number[], el: number[], az: number): number {
  const n = azGrid.length, step = 360 / n, a = ((az - azGrid[0]) % 360 + 360) % 360 / step
  const i = Math.floor(a) % n, f = a - Math.floor(a)
  return el[i] * (1 - f) + el[(i + 1) % n] * f
}

export type Blocking = {
  maxElDeg: number              // highest the body gets during the stay (centre of the disc)
  upFrac: number                // share of the stay above the flat horizon (elevation > 0)
  hiddenFrac: number            // share of the stay above the flat horizon but less than half visible: hidden by terrain
  hiddenAz: [number, number] | null   // compass sector where that happens
  skylineMaxDeg: number | null  // highest skyline in that sector
}

// For one body: az, el and visible fraction per time step (/api/ephemeris), the skyline (/api/horizon).
export function terrainBlocking(az: number[], el: number[], vis: number[], hAz: number[], hEl: number[]): Blocking {
  const n = el.length
  const hidden = el.flatMap((e, i) => (e > 0 && vis[i] < 0.5 ? [i] : []))
  const span = circularSpan(hidden.map((i) => az[i]))
  return {
    maxElDeg: Math.max(...el),
    upFrac: el.filter((e) => e > 0).length / n,
    hiddenFrac: hidden.length / n,
    hiddenAz: span,
    skylineMaxDeg: hidden.length ? Math.max(...hidden.map((i) => skylineAt(hAz, hEl, az[i]))) : null,
  }
}
