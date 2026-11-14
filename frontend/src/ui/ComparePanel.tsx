import { limitsQuery, type Evaluation } from '../data/api'
import { cellValue, landingAt } from '../data/load'
import type { Matrix } from '../data/schemas'
import { useCompareEvaluations } from '../data/useLive'
import { MAX_PINS, useApp, type Mode, type Pin } from '../state/store'
import { ROWS, bestColumns, formatCell, type Cell } from './compare'
import { domain } from './metrics'
import { describeViolation, limitLabel } from './profiles'

const timeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
const HORIZON: Record<string, string> = { 'lola-terrain': 'LOLA terrain', 'smooth-sphere': 'smooth sphere, no terrain' }

// Pins a catalogue site or a clicked point, at the landing date and time currently on the rails.
export function PinButton({ label, lat, lon, siteId }: { label: string; lat: number; lon: number; siteId?: string }) {
  const { dateIdx, minuteUtc: m, mode, pins, addPin } = useApp()
  const minuteUtc = mode === 'live' ? m : 0
  const id = `${siteId ?? `${lat.toFixed(4)},${lon.toFixed(4)}`}@${dateIdx}T${minuteUtc}`
  const pinned = pins.some((p) => p.id === id)
  const full = pins.length >= MAX_PINS
  return (
    <button type="button" className="pin" disabled={pinned || full} onClick={() => addPin({ id, label, lat, lon, dateIdx, minuteUtc, siteId })}>
      {pinned ? 'In the comparison' : full ? `Comparison is full (${MAX_PINS})` : '+ Compare at this date'}
    </button>
  )
}

// Live: the full /api/evaluate result. Offline: the precomputed matrix (catalogue sites only, default settings).
function columnCells(pin: Pin, ev: Evaluation | undefined, mode: Mode, matrix: Matrix): Record<string, Cell> {
  if (ev) return { ...ev.parameters, score: { value: ev.score.value, uncertainty: null } }
  if (mode === 'live' || !pin.siteId) return {}
  return Object.fromEntries(Object.keys(matrix.cells).map((f) =>
    [f, { value: cellValue(matrix, pin.siteId!, f, pin.dateIdx), uncertainty: null }]))
}

// Side by side: each pinned place keeps the landing date and time it was pinned at, so both "which site" and
// "which date" can be compared. Best value per row is highlighted.
export function ComparePanel({ matrix }: { matrix: Matrix }) {
  const { pins, removePin, mode, compareOpen, setCompareOpen, settings } = useApp()
  const hasLimits = Object.keys(limitsQuery(settings)).length > 0
  const dates = matrix.landing_dates_utc
  const evs = useCompareEvaluations(pins, dates)
  if (!compareOpen || pins.length === 0) return null

  const cols = pins.map((p) => columnCells(p, evs.data?.[p.id], mode, matrix))
  const rows = ROWS.filter((r) => cols.some((c) => r.field in c))

  return (
    <section className={`compare${evs.loading ? ' stale' : ''}`} aria-busy={evs.loading} aria-label="Comparison">
      <div className="panel-head">
        <h2>Compare</h2>
        <button type="button" className="close" onClick={() => setCompareOpen(false)} aria-label="Close">×</button>
      </div>
      <p className="note">
        Stay of {settings.missionDays} days from each column's landing time. Best value per row is <span className="best-key">marked</span>.
        {mode !== 'live' && ' Offline: precomputed values with the default settings.'}
      </p>
      {evs.error && <p className="error-inline">{evs.error}</p>}
      {evs.loading && <p className="note updating">{evs.data ? 'Updating…' : 'Computing…'}</p>}
      <div className="compare-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Parameter</span></th>
              {pins.map((p) => (
                <th scope="col" key={p.id}>
                  <div className="col-head">
                    <span>{p.label}<small>landing {timeFmt.format(new Date(landingAt(dates[p.dateIdx], p.minuteUtc)))} UTC</small></span>
                    <button type="button" className="close" onClick={() => removePin(p.id)} aria-label={`Remove ${p.label}`}>×</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const best = bestColumns(cols.map((c) => (r.field in c ? c[r.field].value : undefined)), r)
              return (
                <tr key={r.field}>
                  <th scope="row" className={domain(r.field)}>{r.label}</th>
                  {cols.map((c, i) => <td key={pins[i].id} className={best.has(i) ? 'best' : ''}>{formatCell(r, c[r.field], evs.data?.[pins[i].id]?.uncertainty_model?.components?.[r.field]?.range)}</td>)}
                </tr>
              )
            })}
            {mode === 'live' && hasLimits && (
              <tr>
                <th scope="row">Requirements</th>
                {pins.map((p) => {
                  const ev = evs.data?.[p.id]
                  return (
                    <td key={p.id} className={ev ? (ev.feasible ? 'ok' : 'bad') : ''}>
                      {!ev ? 'n/a' : !ev.feasible ? ev.violations.map(describeViolation).join('; ')
                        : ev.not_checked.length ? `meets checked; not checked: ${ev.not_checked.map(limitLabel).join(', ')}` : 'meets all'}
                    </td>
                  )
                })}
              </tr>
            )}
            {mode === 'live' && (
              <tr>
                <th scope="row">Horizon used</th>
                {pins.map((p) => {
                  const src = evs.data?.[p.id]?.horizon_source
                  return <td key={p.id}>{src ? (HORIZON[src] ?? src) : 'n/a'}</td>
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
