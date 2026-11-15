import { describe, expect, it } from 'vitest'
import { stepLanding } from './animClock'

const LAST = '2149-09-30'
const live = { live: true, minuteUtc: 0, dateIdx: 0, dateCount: 30, first: '2026-11-01T00:00:00Z' }

describe('stepLanding', () => {
  it('moves the time of day and rolls over into the next day', () => {
    expect(stepLanding({ ...live, minuteUtc: 1380 }, 120, LAST)).toEqual({ minuteUtc: 60, dateIdx: 1 })
  })
  it('continues into the next strip (next month) past the last day instead of stopping', () => {
    expect(stepLanding({ ...live, dateIdx: 29, minuteUtc: 1430 }, 60, LAST))
      .toEqual({ minuteUtc: 50, dateIdx: 0, stripStart: '2026-12-01T00:00:00Z' })
  })
  it('keeps the day inside the new strip for steps longer than a day', () => {
    expect(stepLanding({ ...live, dateIdx: 28 }, 3 * 1440, LAST))
      .toEqual({ minuteUtc: 0, dateIdx: 1, stripStart: '2026-12-01T00:00:00Z' })
  })
  it('stops after the last day the ephemeris covers', () => {
    expect(stepLanding({ ...live, first: '2149-09-01T00:00:00Z', dateIdx: 29 }, 1440, LAST)).toBeNull()
  })
  it('offline: stops at the end of the precomputed table', () => {
    expect(stepLanding({ ...live, live: false, dateIdx: 29 }, 1440, LAST)).toBeNull()
    expect(stepLanding({ ...live, live: false, dateIdx: 3 }, 1440, LAST)).toEqual({ minuteUtc: 0, dateIdx: 4 })
  })
})
