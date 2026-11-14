import { describe, expect, it } from 'vitest'
import { ROWS, bestColumns, formatCell } from './compare'

const row = (field: string) => ROWS.find((r) => r.field === field)!

describe('bestColumns', () => {
  it('marks the highest value when higher is better', () => {
    expect([...bestColumns([0.2, 0.8, 0.5], row('sunlit_frac'))]).toEqual([1])
  })
  it('marks the lowest value when lower is better', () => {
    expect([...bestColumns([40, 12, 90], row('longest_dark_h'))]).toEqual([1])
  })
  it('marks every column that ties for best', () => {
    expect([...bestColumns([0.8, 0.8, 0.5], row('sunlit_frac'))]).toEqual([0, 1])
  })
  it('marks nothing when all values are equal or fewer than two are known', () => {
    expect(bestColumns([0.5, 0.5], row('sunlit_frac')).size).toBe(0)
    expect(bestColumns([0.5, null], row('sunlit_frac')).size).toBe(0)
  })
  it('treats "never lost during the stay" (null) as the best time to first sunset', () => {
    expect([...bestColumns([12, null, 0], row('hours_to_first_dark_h'))]).toEqual([1])
  })
  it('does not rank a column that has no data (undefined)', () => {
    expect([...bestColumns([12, undefined, 30], row('hours_to_first_dark_h'))]).toEqual([2])
  })
  it('never ranks rows without a better direction (elevation)', () => {
    expect(bestColumns([100, 2000], row('elevation_m')).size).toBe(0)
  })
})

describe('formatCell', () => {
  it('shows n/a for a missing value, never 0', () => {
    expect(formatCell(row('slope_deg'), undefined)).toBe('n/a')
    expect(formatCell(row('slope_deg'), { value: null, uncertainty: null })).toBe('n/a')
  })
  it('adds the uncertainty when the data has one', () => {
    expect(formatCell(row('elevation_m'), { value: 1758.94, uncertainty: 0.1 })).toBe('1758.9 m ± 0.1 m')
  })
  it('shows the range instead of a ± that would go below zero', () => {
    expect(formatCell(row('longest_dark_h'), { value: 65.27, uncertainty: 66.16 }, [55.25, 131.35])).toBe('65 h (55 h to 131 h)')
  })
  it('spells out the special meanings of time to first sunset', () => {
    expect(formatCell(row('hours_to_first_dark_h'), { value: null, uncertainty: null })).toBe('not during the stay')
    expect(formatCell(row('hours_to_first_dark_h'), { value: 0, uncertainty: null })).toBe('dark at landing')
  })
})

describe('fmtM', () => {
  it('shows metres with the LOLA height error, n/a without a value', async () => {
    const { fmtM } = await import('./format')
    expect(fmtM({ value: 1758.94, uncertainty: 0.08 })).toBe('1758.9 m ± 0.1 m')
    expect(fmtM({ value: null, uncertainty: null })).toBe('n/a')
  })
})

describe('fmtUnc', () => {
  it('shows ± when the bound stays inside the physical limits', async () => {
    const { fmtUnc, fmtH } = await import('./format')
    expect(fmtUnc(fmtH, 65.3, 5, [60, 70], [0, Infinity])).toBe('65 h ± 5 h')
  })
  it('shows the range found when ± would leave the physical limits (AERO API.md)', async () => {
    const { fmtUnc, fmtH } = await import('./format')
    expect(fmtUnc(fmtH, 65.2667, 66.1552, [55.25, 131.35], [0, Infinity])).toBe('65 h (55 h to 131 h)')
  })
  it('shows the bare value without an uncertainty', async () => {
    const { fmtUnc, fmtPct } = await import('./format')
    expect(fmtUnc(fmtPct, 0.8, null)).toBe('80 %')
    expect(fmtUnc(fmtPct, 0.8, 0)).toBe('80 %')
    expect(fmtUnc(fmtPct, 0.8, 0.0004)).toBe('80 %')
  })
})
