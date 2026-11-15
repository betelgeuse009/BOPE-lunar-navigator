import { useEffect, useRef } from 'react'

// Animation of time: each tick moves the time forward by one time step; the speed is the number of ticks per second.
// Used by the surface view (its own clock) and by Mission setup (the landing time of the whole navigator).
export type AnimationState = { playing: boolean; ticksPerSec: number; stepMin: number }
export const DEFAULT_ANIMATION: AnimationState = { playing: false, ticksPerSec: 4, stepMin: 10 }

// Calls onTick(stepMin) ticksPerSec times per second while playing.
export function useTicker(a: AnimationState, onTick: (stepMin: number) => void) {
  const cb = useRef(onTick)
  cb.current = onTick
  useEffect(() => {
    if (!a.playing) return
    const id = window.setInterval(() => cb.current(a.stepMin), 1000 / a.ticksPerSec)
    return () => window.clearInterval(id)
  }, [a.playing, a.ticksPerSec, a.stepMin])
}

export function fmtRate(a: AnimationState): string {
  const m = a.stepMin * a.ticksPerSec
  return m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(m % 60 ? 1 : 0)} h` : `${(m / 1440).toFixed(1)} days`
}

// One step of the landing-time animation. Live: the time of day rolls over into the next days, and past the last day of
// the date strip the strip moves on by whole strips (the next month), so the animation keeps going until the last day
// the ephemeris covers (lastDay). Offline: only the precomputed days exist, so it stops at the end of the table.
// Returns null when the animation must stop.
export type LandingClock = { live: boolean; minuteUtc: number; dateIdx: number; dateCount: number; first: string }
export function stepLanding(c: LandingClock, stepMin: number, lastDay: string):
  { minuteUtc: number; dateIdx: number; stripStart?: string } | null {
  const total = (c.live ? c.minuteUtc : 0) + stepMin
  const idx = c.dateIdx + Math.floor(total / 1440)
  const minuteUtc = c.live ? total % 1440 : c.minuteUtc
  if (idx < c.dateCount) return { minuteUtc, dateIdx: idx }
  if (!c.live || c.dateCount < 1) return null
  const pages = Math.floor(idx / c.dateCount)
  const stripStart = new Date(Date.parse(c.first) + pages * c.dateCount * 86_400_000).toISOString().replace('.000Z', 'Z')
  const dateIdx = idx - pages * c.dateCount
  const day = new Date(Date.parse(stripStart) + dateIdx * 86_400_000).toISOString().slice(0, 10)
  return day > lastDay ? null : { minuteUtc, dateIdx, stripStart }
}
