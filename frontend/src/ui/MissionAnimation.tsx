import { useEffect, useState } from 'react'
import { LIVE_RANGE, useApp } from '../state/store'
import { AnimationControls } from './Animation'
import { DEFAULT_ANIMATION, stepLanding, useTicker, type AnimationState } from './animClock'

// Animates the landing time of the whole navigator: every tick moves the landing time forward by the time step and the
// globe lighting, the results and the strips follow. Live mode moves the time of day and rolls over into the next days,
// and past the end of the date strip into the next month; offline only the precomputed days exist (at 00:00 UTC).
export function MissionAnimation() {
  const { mode, minuteUtc, dateIdx, dateCount, stripStart, staticDates, setMinuteUtc, setDateIdx, setStripStart } = useApp()
  const live = mode === 'live'
  const [a, setA] = useState<AnimationState>({ ...DEFAULT_ANIMATION, stepMin: live ? 60 : 1440 })
  // The mode is known only once the server has answered: 1 h steps live, whole days offline.
  useEffect(() => setA((s) => ({ ...s, playing: false, stepMin: live ? 60 : 1440 })), [live])
  useTicker(a, (step) => {
    const first = stripStart ?? staticDates[0]
    const next = first ? stepLanding({ live, minuteUtc, dateIdx, dateCount, first }, step, LIVE_RANGE[1]) : null
    if (!next) { setA((s) => ({ ...s, playing: false })); return } // end of the precomputed table / of the ephemeris
    if (live) setMinuteUtc(next.minuteUtc)
    if (next.stripStart) setStripStart(next.stripStart, next.dateIdx) // next month: the date strip and its slider move on
    else if (next.dateIdx !== dateIdx) setDateIdx(next.dateIdx)
  })
  return (
    <div className="mission-anim">
      <h3 className="rows-title">Animate the landing time</h3>
      <AnimationControls a={a} set={setA} help="animation" minStepMin={live ? 1 : 1440} />
    </div>
  )
}
