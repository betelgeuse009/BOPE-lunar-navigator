import { DEFAULT_SETTINGS, type Weights } from '../data/api'
import type { TopicId } from '../docs/topics'
import { FACTORS } from './factors'
import { Help } from './Help'
import { domain } from './metrics'
import { Requirements } from './Requirements'
import { useApp } from '../state/store'

// The user's settings, one piece per block of the input pane (ui/InputPanel.tsx).

// Mission block: mission type, minimum requirements, surface stay, mast height.
export function MissionSettings() {
  const { mode, settings, setSettings } = useApp()
  const live = mode === 'live'
  return (
    <>
      <Requirements disabled={!live} />
      <fieldset disabled={!live}>
        <legend>Stay and hardware</legend>
        <Slider label="Surface stay" value={settings.missionDays} min={1} max={28} step={0.5} unit="days" help="surface-stay"
          onChange={(v) => setSettings({ missionDays: v })} />
        <Slider label="Mast height (solar array and antenna)" value={settings.obsHeightM} min={0} max={20} step={0.5} unit="m" help="mast-height"
          onChange={(v) => setSettings({ obsHeightM: v })} />
      </fieldset>
    </>
  )
}

// Search nearby block: search around the chosen place.
export function NearbySearch() {
  const { mode, radiusKm, setRadiusKm, scaleMode, setScaleMode, point } = useApp()
  const live = mode === 'live'
  return (
    <fieldset disabled={!live || !point}>
      <legend>Search nearby <Help topic="nearby-search" /></legend>
      <Slider label="Radius around the chosen place" value={radiusKm} min={0} max={50} step={1} unit="km" help="nearby-search"
        onChange={setRadiusKm} format={(v) => (v === 0 ? 'off' : `${v} km`)} />
      <div className="toggle" role="radiogroup" aria-label="Colour scale">
        <label><input type="radio" checked={scaleMode === 'absolute'} onChange={() => setScaleMode('absolute')} /> Absolute 0 to 1</label>
        <label><input type="radio" checked={scaleMode === 'relative'} onChange={() => setScaleMode('relative')} /> Relative to this area</label>
      </div>
    </fieldset>
  )
}

// Score weights block: the rule for each factor and its weight.
export function ScoreSettings() {
  const { mode, settings, setSettings } = useApp()
  const live = mode === 'live'
  const setWeight = (k: keyof Weights, v: number) => setSettings({ weights: { ...settings.weights, [k]: v } })
  return (
    <>
      <fieldset disabled={!live}>
        <legend>Factors and weights <Help topic="score-weights" /></legend>
        {FACTORS.map((f) => (
          <div key={f.key} className={`factor ${domain(f.api) ?? ''}`}>
            <Slider label={f.label} value={settings.weights[f.key]} min={0} max={3} step={0.5} unit="" help={f.help}
              onChange={(v) => setWeight(f.key, v)} />
          </div>
        ))}
        <button type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset to defaults</button>
      </fieldset>
    </>
  )
}

function Slider(p: { label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; format?: (v: number) => string; help: TopicId }) {
  return (
    <label className="slider">
      <span>{p.label} <Help topic={p.help} /></span>
      <output>{p.format ? p.format(p.value) : `${p.value}${p.unit ? ` ${p.unit}` : ''}`}</output>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    </label>
  )
}
