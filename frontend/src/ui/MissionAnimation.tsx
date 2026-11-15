import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { AnimationControls } from './Animation'
import { DEFAULT_ANIMATION, useTicker, type AnimationState } from './animClock'

// Animates the landing time of the whole navigator: every tick moves the landing time forward by the time step and the
// globe lighting, the results and the strips follow. Live mode moves the time of day and rolls over into the next days;
// offline only whole days exist (the precomputed files are at 00:00 UTC).
export function MissionAnimation() {
  const { mode, minuteUtc, dateIdx, dateCount, setMinuteUtc, setDateIdx } = useApp()
  const live = mode === 'live'
  const [a, setA] = useState<AnimationState>({ ...DEFAULT_ANIMATION, stepMin: live ? 60 : 1440 })
  // The mode is known only once the server has answered: 1 h steps live, whole days offline.
  useEffect(() => setA((s) => ({ ...s, playing: false, stepMin: live ? 60 : 1440 })), [live])
  useTicker(a, (step) => {
    const total = (live ? minuteUtc : 0) + step
    const days = Math.floor(total / 1440)
    if (dateIdx + days > dateCount - 1) { setA((s) => ({ ...s, playing: false })); return } // end of the date strip
    if (live) setMinuteUtc(total % 1440)
    if (days) setDateIdx(dateIdx + days)
  })
  return (
    <div className="mission-anim">
      <h3 className="rows-title">Animate the landing time</h3>
      <AnimationControls a={a} set={setA} help="animation" minStepMin={live ? 1 : 1440} />
    </div>
  )
}
