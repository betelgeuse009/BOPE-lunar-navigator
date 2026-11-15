import { describe, expect, it } from 'vitest'
import { durationH, fmtDuration, repeatPeriod } from './periods'

const w = (s: string, e: string) => ({ start_utc: s, end_utc: e })
const T0 = '2026-11-15T00:00:00Z'

describe('periods', () => {
  it('measures a period and formats it in hours or days', () => {
    expect(durationH(w('2026-11-01T00:00:00Z', '2026-11-01T06:30:00Z'))).toBe(6.5)
    expect(fmtDuration(6.5)).toBe('6.5 h')
    expect(fmtDuration(324)).toBe('13.5 days')
  })
  // Real /api/metrics answer, 89.45 S 137.31 W, 90 days from 15 Nov 2026 (ridge interruption on 25-27 Dec).
  const sun = [w(T0, '2026-11-20T20:30:00Z'), w('2026-11-25T19:20:00Z', '2026-12-20T06:00:00Z'), w('2026-12-25T23:20:00Z', '2026-12-27T04:20:00Z'),
    w('2026-12-27T22:00:00Z', '2027-01-18T07:20:00Z'), w('2027-01-28T05:40:00Z', '2027-02-13T00:00:00Z')]
  const earth = [w('2026-11-19T03:10:00Z', '2026-11-28T15:10:00Z'), w('2026-12-16T05:40:00Z', '2026-12-25T22:00:00Z'),
    w('2027-01-12T08:20:00Z', '2027-01-22T08:50:00Z'), w('2027-02-08T13:00:00Z', '2027-02-13T00:00:00Z')]
  it('finds a monthly cycle despite a short ridge interruption', () => {
    const s = repeatPeriod(sun, T0, 90)!, e = repeatPeriod(earth, T0, 90)!
    expect(s.days).toBeGreaterThan(28.5)
    expect(s.days).toBeLessThan(31)
    expect(e.days).toBeGreaterThan(26.5)
    expect(e.days).toBeLessThan(28)
  })
  it('gives nothing when the body is always or never in view', () => {
    expect(repeatPeriod([w(T0, '2027-02-13T00:00:00Z')], T0, 90)).toBeNull()
    expect(repeatPeriod([], T0, 90)).toBeNull()
  })
})
