import { fmtDeg, fmtH, fmtPct, fmtUnc, untilLoss } from './format'

// Rows of the comparison table. Field names are AERO's (docs/PARAMETERS.md, /api/evaluate parameters, matrix cells).
// `better` says which way the best column lies; null = no ranking (context only, or no agreed direction).
// `nullMeans` ranks a null value: for the "first loss" times null means "never lost during the stay".
export type Cell = { value: number | null; uncertainty: number | null }
export type Row = { field: string; label: string; better: 'high' | 'low' | null; fmt: (v: number) => string
  nullText?: string; nullMeans?: number; bounds?: [number, number] }

export const ROWS: Row[] = [
  { field: 'score', label: 'Score (0 to 1)', better: 'high', fmt: (v) => v.toFixed(2) },
  { field: 'sunlit_frac', label: 'Sunlight', better: 'high', fmt: fmtPct, bounds: [0, 1] },
  { field: 'longest_dark_h', label: 'Longest night', better: 'low', fmt: fmtH, bounds: [0, Infinity] },
  { field: 'hours_to_first_dark_h', label: 'First sunset after landing', better: 'high',
    fmt: (v) => untilLoss(v, 'dark at landing'), nullText: 'not during the stay', nullMeans: Infinity },
  { field: 'mean_sun_el_when_lit_deg', label: 'Mean Sun elevation when lit', better: null, fmt: fmtDeg },
  { field: 'earth_visible_frac', label: 'Earth in view', better: 'high', fmt: fmtPct, bounds: [0, 1] },
  { field: 'longest_no_earth_h', label: 'Longest blackout', better: 'low', fmt: fmtH, bounds: [0, Infinity] },
  { field: 'hours_to_first_earth_loss_h', label: 'First Earthset after landing', better: 'high',
    fmt: (v) => untilLoss(v, 'no Earth at landing'), nullText: 'not during the stay', nullMeans: Infinity },
  { field: 'both_frac', label: 'Sunlight and Earth together', better: 'high', fmt: fmtPct, bounds: [0, 1] },
  { field: 'slope_deg', label: 'Slope', better: 'low', fmt: fmtDeg, bounds: [0, 90] },
  { field: 'elevation_m', label: 'Altitude', better: null, fmt: (v) => `${v.toFixed(1)} m` },
]

export function formatCell(row: Row, cell: Cell | undefined, range?: [number, number] | null): string {
  if (!cell || cell.value === null) return cell && row.nullText ? row.nullText : 'n/a'
  return fmtUnc(row.fmt, cell.value, cell.uncertainty, range, row.bounds)
}

// Columns holding the best value of the row (all of them on a tie). Nothing when fewer than two values are known
// or all are equal: highlighting then says nothing. undefined = no data for that column; null = the API's null.
export function bestColumns(values: (number | null | undefined)[], row: Row): Set<number> {
  if (!row.better) return new Set()
  const ranked = values.map((v) => (v === undefined ? null : v === null ? (row.nullMeans ?? null) : v))
  const known = ranked.filter((v): v is number => v !== null)
  if (known.length < 2) return new Set()
  const best = row.better === 'high' ? Math.max(...known) : Math.min(...known)
  if (known.every((v) => v === best)) return new Set()
  return new Set(ranked.flatMap((v, i) => (v === best ? [i] : [])))
}
