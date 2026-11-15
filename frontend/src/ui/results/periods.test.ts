import { describe, expect, it } from 'vitest'
import { durationH, fmtDuration, repeatPeriod } from './periods'

const w = (s: string, e: string) => ({ start_utc: s, end_utc: e })

describe('periods', () => {
  it('measures a period and formats it in hours or days', () => {
    expect(durationH(w('2026-11-01T00:00:00Z', '2026-11-01T06:30:00Z'))).toBe(6.5)
    expect(fmtDuration(6.5)).toBe('6.5 h')
    expect(fmtDuration(324)).toBe('13.5 days')
  })
  it('averages rise to rise, leaving out a period cut by the start of the window', () => {
    const list = [
      w('2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z'), // already up at the start: not a rise
      w('2026-11-20T00:00:00Z', '2026-12-04T00:00:00Z'),
      w('2026-12-19T12:00:00Z', '2027-01-02T00:00:00Z'),
      w('2027-01-18T00:00:00Z', '2027-01-30T00:00:00Z'),
    ]
    expect(repeatPeriod(list, '2026-11-01T00:00:00Z')).toEqual({ days: 29.5, n: 2 })
  })
  it('gives nothing with fewer than two rises', () => {
    expect(repeatPeriod([w('2026-11-01T00:00:00Z', '2027-01-30T00:00:00Z')], '2026-11-01T00:00:00Z')).toBeNull()
    expect(repeatPeriod([], '2026-11-01T00:00:00Z')).toBeNull()
  })
})
