import { describe, expect, it } from 'vitest'
import type { Site } from '../data/schemas'
import { parseCoords, search } from './search'

const site = (id: string, name: string, lat: number, lon: number) => ({ id, name, lat_deg: lat, lon_deg: lon }) as unknown as Site
const SITES = [site('a11', 'Apollo 11 (Tranquility Base)', 0.67, 23.47), site('ce4', "Chang'e 4", -45.44, 177.6)]
const NAMES = [
  { name: 'Schrödinger', lat: -75, lon: 132.4, dKm: 316, code: 'AA' },
  { name: 'Mare Tranquillitatis', lat: 8.35, lon: 30.8, dKm: 875, code: 'ME' },
  { name: 'Shackleton', lat: -89.67, lon: 129.78, dKm: 21, code: 'AA' },
]

describe('search', () => {
  it('reads coordinates in common forms', () => {
    expect(parseCoords('-89.45, -137.31')).toEqual({ lat: -89.45, lon: -137.31 })
    expect(parseCoords('89.45S 137.31W')).toEqual({ lat: -89.45, lon: -137.31 })
    expect(parseCoords('89.45° S, 137.31° W')).toEqual({ lat: -89.45, lon: -137.31 })
    expect(parseCoords('10 270')).toEqual({ lat: 10, lon: -90 })
    expect(parseCoords('95, 0')).toBeNull()
    expect(parseCoords('Shackleton')).toBeNull()
  })
  it('finds sites and features, ignoring case and accents, start of a word first', () => {
    expect(search('schrodinger', SITES, NAMES).map((h) => h.label)).toEqual(['Schrödinger'])
    expect(search('tranq', SITES, NAMES).map((h) => h.label)).toEqual(['Apollo 11 (Tranquility Base)', 'Mare Tranquillitatis'])
    expect(search('shack', SITES, NAMES)[0]).toMatchObject({ kind: 'feature', lat: -89.67 })
  })
  it('puts typed coordinates first', () => {
    expect(search('-89.45, -137.31', SITES, NAMES)[0].kind).toBe('coords')
    expect(search('', SITES, NAMES)).toEqual([])
  })
})
