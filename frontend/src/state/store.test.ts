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
  it('re-clamps when the date count shrinks', () => {
    useApp.getState().setDateIdx(30)
    useApp.getState().setDateCount(10)
    expect(useApp.getState().dateIdx).toBe(9)
  })
})
