import type { Evaluation } from '../data/api'
import { useApp } from '../state/store'
import { assess } from './warnings'

// Warning level of a parameter of this evaluation (ui/warnings.ts): the user's requirements, the server's
// "at risk" list and the default bands. A key missing from the answer gives no level.
export function useWarn(ev: Evaluation | null) {
  const { limits, profile } = useApp((s) => s.settings)
  return (field: string) => (!ev ? null
    : assess(field, field === 'score' ? ev.score.value : field in ev.parameters ? ev.parameters[field].value : undefined,
      { limits, atRisk: ev.requirements_at_risk, profile }))
}
