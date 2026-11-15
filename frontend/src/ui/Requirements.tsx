import type { LimitKey, ProfileId } from '../data/api'
import { useApp } from '../state/store'
import { Help } from './Help'
import { LIMITS, PROFILES, profileSettings } from './profiles'

// Mission type + minimum requirements (hard limits). The analysis server judges them (/evaluate, /area);
// this panel only collects them; where each preset value comes from is in the documentation (docs/topics.ts).
export function Requirements({ disabled }: { disabled: boolean }) {
  const { settings, setSettings } = useApp()
  const setLimit = (k: LimitKey, v: number | null | undefined) => {
    const limits = { ...settings.limits }
    if (v === undefined) delete limits[k]
    else limits[k] = v
    setSettings({ limits })
  }

  return (
    <fieldset disabled={disabled} className="requirements">
      <legend>Mission type <Help topic="mission-type" /></legend>
      <div className="toggle" role="radiogroup" aria-label="Mission type">
        {(Object.keys(PROFILES) as ProfileId[]).map((id) => (
          <label key={id}>
            <input type="radio" name="profile" checked={settings.profile === id} onChange={() => setSettings(profileSettings(id))} />
            {' '}{PROFILES[id].label}
          </label>
        ))}
      </div>

      <h3>Minimum requirements <Help topic="requirements" /></h3>
      {LIMITS.map((l) => {
        const on = l.key in settings.limits
        const v = settings.limits[l.key] ?? null
        const shown = v === null ? '' : String(l.pct ? +(v * 100).toFixed(3) : v) // rock abundance needs hundredths of a percent
        return (
          <div key={l.key} className="limit">
            <span><label>
              <input type="checkbox" checked={on} onChange={(e) => setLimit(l.key, e.target.checked ? null : undefined)} />
              {' '}{l.label}
            </label>
            {' '}<Help topic={l.help} /></span>
            <span className="limit-value">
              <input type="number" min={0} max={l.max} step="any" value={shown} disabled={!on} aria-label={`${l.label} (${l.unit})`}
                onChange={(e) => setLimit(l.key, e.target.value === '' ? null : Number(e.target.value) / (l.pct ? 100 : 1))} />
              {l.unit}
            </span>
            {on && v === null && <p className="note">Enter a value.</p>}
          </div>
        )
      })}
    </fieldset>
  )
}
