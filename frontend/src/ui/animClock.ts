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
