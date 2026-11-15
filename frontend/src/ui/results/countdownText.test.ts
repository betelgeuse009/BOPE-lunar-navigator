import { describe, expect, it } from 'vitest'
import { countdownText, fmtCountdown } from './countdownText'

describe('countdown', () => {
  it('formats days, hours and minutes', () => {
    expect(fmtCountdown(76)).toBe('3 d 4 h')
    expect(fmtCountdown(11.34)).toBe('11 h 20 min')
    expect(fmtCountdown(5)).toBe('5 h')
    expect(fmtCountdown(0.25)).toBe('15 min')
  })
  it('says what happens first', () => {
    expect(countdownText('sun', 76, 0, 336)).toBe('Sunset in 3 d 4 h')
    expect(countdownText('sun', null, 0, 336)).toBe('Sun up for the whole stay (14 d 0 h)')
    expect(countdownText('sun', 0, 30, 336)).toBe('Dark at landing, sunrise in 30 h')
    expect(countdownText('earth', 0, null, 336)).toBe('No Earth during the stay')
    expect(countdownText('earth', 11.5, 0, 336)).toBe('Earthset in 11 h 30 min')
  })
})
