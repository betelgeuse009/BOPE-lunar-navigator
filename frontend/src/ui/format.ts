export const fmtH = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v)} h`)
export const fmtPct = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v * 100)} %`)
// Metres with the stated uncertainty when the data has one (e.g. LOLA height error).
export const fmtM = (c: { value: number | null; uncertainty: number | null } | undefined) =>
  c?.value == null ? 'n/a' : `${c.value.toFixed(1)} m${c.uncertainty != null ? ` ± ${c.uncertainty.toFixed(1)} m` : ''}`
// Regolith context values (Diviner): temperature in K with °C, rock abundance as % of the surface, H-parameter in cm.
export const fmtK = (v: number | null | undefined) => (v == null ? 'n/a' : `${Math.round(v)} K (${Math.round(v - 273.15)} °C)`)
export const fmtRock = (v: number | null | undefined) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)} %`)
export const fmtH_cm = (v: number | null | undefined) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)} cm`)
export const fmtDeg = (v: number | null | undefined) => (v == null ? 'n/a' : `${v.toFixed(1)}°`)
// hours_to_first_dark_h / hours_to_first_earth_loss_h (PARAMETERS.md): null = never lost during the stay, 0 = already lost at landing.
export const untilLoss = (v: number | null, atLanding: string) => (v == null ? 'not during the stay' : v === 0 ? atLanding : fmtH(v))
export const fmtCoords = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`
// Value with its uncertainty (AERO /api/evaluate): "v ± u", or the range actually found when v ± u would leave the
// physical limits (e.g. a negative night length), as contracts/API.md asks.
export function fmtUnc(fmt: (v: number) => string, v: number, u: number | null | undefined,
  range?: [number, number] | null, bounds?: [number, number]): string {
  if (u == null || fmt(u) === fmt(0)) return fmt(v) // no '± 0 %' when the uncertainty rounds away
  if (range && bounds && (v - u < bounds[0] || v + u > bounds[1])) return `${fmt(v)} (${fmt(range[0])} to ${fmt(range[1])})`
  return `${fmt(v)} ± ${fmt(u)}`
}
