export const fmtH = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v)} h`)
export const fmtPct = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v * 100)} %`)
// Metres with the stated uncertainty when the data has one (e.g. LOLA height error).
export const fmtM = (c: { value: number | null; uncertainty: number | null } | undefined) =>
  c?.value == null ? 'n/a' : `${c.value.toFixed(1)} m${c.uncertainty != null ? ` ± ${c.uncertainty.toFixed(1)} m` : ''}`
export const fmtDeg = (v: number | null | undefined) => (v == null ? 'n/a' : `${v.toFixed(1)}°`)
// hours_to_first_dark_h / hours_to_first_earth_loss_h (PARAMETERS.md): null = never lost during the stay, 0 = already lost at landing.
export const untilLoss = (v: number | null, atLanding: string) => (v == null ? 'not during the stay' : v === 0 ? atLanding : fmtH(v))
export const fmtCoords = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`
