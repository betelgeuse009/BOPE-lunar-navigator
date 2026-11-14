import { describe, expect, it } from 'vitest'
import { ephemerisCsv } from './csv'

describe('ephemerisCsv', () => {
  it('writes one row per time step and only the columns that were sent', () => {
    const csv = ephemerisCsv({
      contract_version: '0.1', time_utc: ['2026-11-15T00:00:00Z', '2026-11-15T00:10:00Z'],
      sun_az_deg: [81.9, 82.2], sun_el_deg: [-19.3, -18.9], sun_visible_frac: [0, 0],
      earth_az_deg: [195.7, 195.8], earth_el_deg: [66.3, 66.2], earth_visible_frac: [1, 1],
      earth_phase_frac: [0.73, 0.72],
    })
    expect(csv.split('\n')).toEqual([
      'time_utc,sun_az_deg,sun_el_deg,sun_visible_frac,earth_az_deg,earth_el_deg,earth_visible_frac,earth_phase_frac',
      '2026-11-15T00:00:00Z,81.9,-19.3,0,195.7,66.3,1,0.73',
      '2026-11-15T00:10:00Z,82.2,-18.9,0,195.8,66.2,1,0.72',
      '',
    ])
  })
})
