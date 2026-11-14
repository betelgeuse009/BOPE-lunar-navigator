import type { LimitKey, ProfileId } from '../data/api'
import { useApp } from '../state/store'
import { Help } from './Help'
import { LIMITS, PROFILES, profileSettings } from './profiles'

// Mission type + minimum requirements (hard limits). The analysis server judges them (/evaluate, /area);
// this panel only collects them and says where each preset value comes from.
export function Requirements({ disabled }: { disabled: boolean }) {
  const { settings, setSettings } = useApp()
  const profile = PROFILES[settings.profile]
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
      <p className="note">{profile.description}</p>
      {profile.missionDays && settings.missionDays === profile.missionDays.value && (
        <p className="source">Surface stay {profile.missionDays.value} days. Source: {profile.missionDays.source}</p>
      )}

      <h3>Minimum requirements <Help topic="requirements" /></h3>
      {LIMITS.map((l) => {
        const on = l.key in settings.limits
        const v = settings.limits[l.key] ?? null
        const cited = profile.limits[l.key]
        const shown = v === null ? '' : String(l.pct ? Math.round(v * 1000) / 10 : v)
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
            {on && v === null && <p className="note">Enter a value. {cited?.source ?? ''}</p>}
            {on && cited && cited.value !== null && v === cited.value && <p className="source">Source: {cited.source}</p>}
          </div>
        )
      })}
    </fieldset>
  )
}
