import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Manifest, Matrix, Sites } from './schemas'
import { cellValue, isFixture, parseFile } from './load'

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
    const { contract_version: _, ...bad } = fixture('sites.json')
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

describe('isFixture', () => {
  it('detects fixture files from source.notes', () => {
    expect(isFixture(fixture('sites.json'))).toBe(true)
    expect(isFixture({ source: { notes: 'real data' } })).toBe(false)
  })
})
