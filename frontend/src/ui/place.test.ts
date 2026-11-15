import { describe, expect, it } from 'vitest'
import { parsePlace } from './place'

describe('parsePlace', () => {
  it('reads decimal degrees, with a comma or a point', () => {
    expect(parsePlace('-89.45', '-137.31')).toEqual({ lat: -89.45, lon: -137.31 })
    expect(parsePlace('-89,45', '10,5')).toEqual({ lat: -89.45, lon: 10.5 })
  })
  it('turns an east longitude 0..360 into -180..180', () => {
    expect(parsePlace('0', '270')).toEqual({ lat: 0, lon: -90 })
  })
  it('refuses values out of range or empty', () => {
    expect(parsePlace('-91', '0')).toMatch(/Latitude/)
    expect(parsePlace('', '0')).toMatch(/Latitude/)
    expect(parsePlace('0', '400')).toMatch(/Longitude/)
    expect(parsePlace('0', 'abc')).toMatch(/Longitude/)
  })
})
