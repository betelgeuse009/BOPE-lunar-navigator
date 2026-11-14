import { DEFAULT_SETTINGS, type Weights } from '../data/api'
import { FACTORS } from './factors'
import { useApp } from '../state/store'

export function SettingsPanel() {
  const { mode, settings, setSettings, radiusKm, setRadiusKm, scaleMode, setScaleMode, point } = useApp()
  const live = mode === 'live'
  const setWeight = (k: keyof Weights, v: number) => setSettings({ weights: { ...settings.weights, [k]: v } })

  return (
    <aside className="settings">
      <details open>
        <summary>How the score works</summary>
        <p>
          Every place gets a score from 0 (worst) to 1 (best) for a mission that lands on the chosen date and stays
          {' '}{settings.missionDays} days. Four factors each give a sub-score from 0 to 1:
        </p>
        <dl className="factors">
          {FACTORS.map((f) => (
            <div key={f.key}><dt>{f.label}</dt><dd>{f.rule}</dd></div>
          ))}
        </dl>
        <p>
          The score is the weighted average of the four. Set a weight to 0 to ignore a factor, for example Earth
          when a relay satellite carries the link. Landing slope joins once terrain data is in.
        </p>
        <p className="note">Method: docs/PARAMETERS.md (analysis team). Terrain is not yet included, so nearby points score almost the same.</p>
      </details>

      <fieldset disabled={!live}>
        <legend>Mission</legend>
        <Slider label="Surface stay" value={settings.missionDays} min={1} max={28} step={1} unit="days"
          onChange={(v) => setSettings({ missionDays: v })} />
        <Slider label="Mast height (solar array and antenna)" value={settings.obsHeightM} min={0} max={20} step={0.5} unit="m"
          onChange={(v) => setSettings({ obsHeightM: v })} />
      </fieldset>

      <fieldset disabled={!live}>
        <legend>Weights</legend>
        {FACTORS.map((f) => (
          <Slider key={f.key} label={f.label} value={settings.weights[f.key]} min={0} max={3} step={0.5} unit=""
            onChange={(v) => setWeight(f.key, v)} />
        ))}
        <button type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset to defaults</button>
      </fieldset>

      <fieldset disabled={!live || !point}>
        <legend>Search nearby</legend>
        <Slider label="Radius around the clicked point" value={radiusKm} min={0} max={50} step={1} unit="km"
          onChange={setRadiusKm} format={(v) => (v === 0 ? 'off' : `${v} km`)} />
        <div className="toggle" role="radiogroup" aria-label="Colour scale">
          <label><input type="radio" checked={scaleMode === 'absolute'} onChange={() => setScaleMode('absolute')} /> Absolute 0 to 1</label>
          <label><input type="radio" checked={scaleMode === 'relative'} onChange={() => setScaleMode('relative')} /> Relative to this area</label>
        </div>
        {live && !point && <p className="note">Click a place on the Moon first.</p>}
      </fieldset>

      {mode === 'static' && (
        <p className="note">
          Live analysis is off: the analysis server is not running. Start it with
          <code> python -m uvicorn analysis.api:app --port 8000</code> and reload. Site colours use the precomputed defaults.
        </p>
      )}
    </aside>
  )
}

function Slider(p: { label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="slider">
      <span>{p.label}</span>
      <output>{p.format ? p.format(p.value) : `${p.value}${p.unit ? ` ${p.unit}` : ''}`}</output>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    </label>
  )
}
