import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Manifest, Matrix, Scene, Sites } from './schemas'
import { cellValue, isPreliminary, landingAt, parseFile, periodAt, sceneIndexAt } from './load'

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../public/fixtures/${name}`, import.meta.url), 'utf8'))

describe('parseFile', () => {
  it('accepts the generated fixtures', () => {
    expect(parseFile(Manifest, fixture('manifest.json'), 'manifest.json').periods.length).toBeGreaterThan(0)
    expect(parseFile(Sites, fixture('sites.json'), 'sites.json').sites.length).toBe(5)
    expect(parseFile(Matrix, fixture('matrix.json'), 'matrix.json').site_ids.length).toBe(5)
  })
  it('rejects another contract version with a readable message', () => {
    const bad = { ...fixture('sites.json'), contract_version: '0.2' }
    expect(() => parseFile(Sites, bad, 'sites.json')).toThrow(/sites\.json: contract_version 0\.2, expected 0\.1/)
  })
  it('rejects a file with no contract_version', () => {
    const bad = fixture('sites.json')
    delete bad.contract_version
    expect(() => parseFile(Sites, bad, 'sites.json')).toThrow(/expected 0\.1/)
  })
})

describe('cellValue', () => {
  const m = parseFile(Matrix, fixture('matrix.json'), 'matrix.json')
  it('returns a number for a computed cell', () => {
    expect(typeof cellValue(m, 'fixture-b', 'both_frac', 0)).toBe('number')
  })
  it('returns null for a cell that is not computed', () => {
    // generator nulls cells[field i][site i % 5][10 + i]; both_frac is field 2
    expect(cellValue(m, 'fixture-c', 'both_frac', 12)).toBeNull()
  })
  it('returns null for a site missing from the matrix', () => {
    expect(cellValue(m, 'not-a-site', 'both_frac', 0)).toBeNull()
  })
  it('returns null for an unknown field or out-of-range date', () => {
    expect(cellValue(m, 'fixture-a', 'nope', 0)).toBeNull()
    expect(cellValue(m, 'fixture-a', 'both_frac', 999)).toBeNull()
  })
})

describe('isPreliminary', () => {
  it('flags FE fixtures and AERO sample data from source.notes', () => {
    expect(isPreliminary(fixture('sites.json'))).toBe(true)
    expect(isPreliminary({ source: { notes: 'SAMPLE DATA for front-end development.' } })).toBe(true)
    expect(isPreliminary({ source: { notes: 'Horizon from LOLA 80 m.' } })).toBe(false)
  })
})

// AERO sample data (data/samples/, real SPICE geometry for example points)
const sample = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../data/samples/${name}`, import.meta.url), 'utf8'))

describe('AERO samples', () => {
  it('parse with the v0.1 loaders', () => {
    expect(parseFile(Manifest, sample('manifest.json'), 'manifest.json').periods.map((p) => p.id)).toEqual(['2026-11', '2026-12'])
    expect(parseFile(Sites, sample('sites.json'), 'sites.json').sites).toHaveLength(3)
    expect(parseFile(Matrix, sample('matrix.json'), 'matrix.json').landing_dates_utc).toHaveLength(30)
    expect(parseFile(Scene, sample('scene/2026-11.json'), 'scene').time_utc).toHaveLength(4320)
  })
})

describe('periodAt', () => {
  const m = parseFile(Manifest, sample('manifest.json'), 'manifest.json')
  it('finds the period containing a time', () => {
    expect(periodAt(m, '2026-11-15T00:00:00Z')?.id).toBe('2026-11')
    expect(periodAt(m, '2026-12-01T00:00:00Z')?.id).toBe('2026-12')
  })
  it('returns null outside every period', () => {
    expect(periodAt(m, '2027-03-01T00:00:00Z')).toBeNull()
  })
})

describe('sceneIndexAt', () => {
  const sc = parseFile(Scene, sample('scene/2026-11.json'), 'scene')
  it('returns the exact step for a time on the grid', () => {
    expect(sceneIndexAt(sc, '2026-11-01T00:10:00Z')).toBe(1)
  })
  it('returns the nearest step between grid times and clamps outside', () => {
    expect(sceneIndexAt(sc, '2026-11-01T00:16:00Z')).toBe(2)
    expect(sceneIndexAt(sc, '2026-10-01T00:00:00Z')).toBe(0)
    expect(sceneIndexAt(sc, '2027-01-01T00:00:00Z')).toBe(4319)
  })
})

describe('landingAt', () => {
  it('sets the landing time of day (minutes after 00:00 UTC) on a landing date', () => {
    expect(landingAt('2026-11-15T00:00:00Z', 0)).toBe('2026-11-15T00:00:00Z')
    expect(landingAt('2026-11-15T00:00:00Z', 13 * 60 + 7)).toBe('2026-11-15T13:07:00Z')
    expect(landingAt('2026-11-15T00:00:00Z', 1439)).toBe('2026-11-15T23:59:00Z')
  })
  it('replaces the time of a date that already has one', () => {
    expect(landingAt('2026-11-15T06:00:00Z', 23 * 60)).toBe('2026-11-15T23:00:00Z')
  })
})
