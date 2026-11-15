import type { TopicId } from '../docs/topics'
import { Help } from './Help'
import { fmtRate, type AnimationState } from './animClock'

const STEPS: [number, string][] = [[1, '1 min'], [10, '10 min'], [30, '30 min'], [60, '1 h'], [360, '6 h'], [1440, '1 day']]

export function AnimationControls({ a, set, help, minStepMin = 1, compact = false }: {
  a: AnimationState; set: (a: AnimationState) => void; help: TopicId; minStepMin?: number; compact?: boolean
}) {
  return (
    <div className={`anim${compact ? ' anim-compact' : ''}`}>
      <button type="button" className="anim-play" onClick={() => set({ ...a, playing: !a.playing })}
        aria-label={a.playing ? 'Pause the animation' : 'Play the animation'} aria-pressed={a.playing}>
        {a.playing
          ? <svg viewBox="0 0 16 16" aria-hidden><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
          : <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2 14 8 4 14z" /></svg>}
      </button>
      <label className="anim-field">
        <span>Speed <Help topic={help} /></span>
        <input type="range" min={1} max={30} step={1} value={a.ticksPerSec} onChange={(e) => set({ ...a, ticksPerSec: Number(e.target.value) })}
          aria-valuetext={`${a.ticksPerSec} steps per second`} />
        <output>{a.ticksPerSec} steps/s</output>
      </label>
      <label className="anim-field">
        <span>Time step</span>
        <span className="anim-step">
          <input type="number" min={minStepMin} max={10080} step={minStepMin} value={a.stepMin}
            onChange={(e) => set({ ...a, stepMin: Math.max(minStepMin, Math.round(Number(e.target.value) / minStepMin) * minStepMin || minStepMin) })} />
          <span>min</span>
          <select value={STEPS.some(([m]) => m === a.stepMin) ? a.stepMin : ''} onChange={(e) => e.target.value && set({ ...a, stepMin: Number(e.target.value) })}
            aria-label="Preset time steps">
            <option value="">preset</option>
            {STEPS.filter(([m]) => m >= minStepMin).map(([m, l]) => <option key={m} value={m}>{l}</option>)}
          </select>
        </span>
      </label>
      {!compact && <p className="anim-note">One step every {(1000 / a.ticksPerSec).toFixed(0)} ms: {fmtRate(a)} of mission time per second.</p>}
    </div>
  )
}
