import { describe, expect, it } from 'vitest'
import { landingType } from './sites'

describe('landingType', () => {
  it('crewed for Apollo and Artemis, robotic for everything else', () => {
    expect(landingType({ category: 'apollo' })).toBe('crewed')
    expect(landingType({ category: 'artemis' })).toBe('crewed')
    for (const c of ['clps', 'international', 'commercial', 'other']) expect(landingType({ category: c })).toBe('robotic')
  })
})
