import { beforeEach, describe, expect, it } from 'vitest'
import { useApp } from './store'

describe('store', () => {
  beforeEach(() => useApp.getState().setDateCount(31))

  it('defaults to the overall score', () => {
    expect(useApp.getState().metric).toBe('score')
  })
  it('clamps the date index to the available dates', () => {
    useApp.getState().setDateIdx(-3)
    expect(useApp.getState().dateIdx).toBe(0)
    useApp.getState().setDateIdx(500)
    expect(useApp.getState().dateIdx).toBe(30)
  })
  it('pins up to four places for comparison, each place and date once', () => {
    const pin = (id: string) => ({ id, label: id, lat: 0, lon: 0, dateIdx: 0, dateUtc: '2026-11-01T00:00:00Z', minuteUtc: 0 })
    useApp.setState({ pins: [] })
    ;['a', 'b', 'a', 'c', 'd', 'e'].forEach((id) => useApp.getState().addPin(pin(id)))
    expect(useApp.getState().pins.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
    useApp.getState().removePin('b')
    expect(useApp.getState().pins.map((p) => p.id)).toEqual(['a', 'c', 'd'])
  })
  it('re-clamps when the date count shrinks', () => {
    useApp.getState().setDateIdx(30)
    useApp.getState().setDateCount(10)
    expect(useApp.getState().dateIdx).toBe(9)
  })
})
