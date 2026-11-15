import { Help } from './Help'
import { LEVEL_SIGN, type Verdict } from './warnings'

const WORD = { ok: 'OK', warn: 'Warning', bad: 'Fails' } as const

// The warning badge after a value (rules: ui/warnings.ts): a sign in a coloured disc, the reason on hover and for
// screen readers. Shape and colour both carry the level, so it reads without colour vision too.
export function Status({ v }: { v: Verdict | null | undefined }) {
  if (!v) return null
  return <span className={`status status-${v.level}`} title={v.text} role="img" aria-label={`${WORD[v.level]}: ${v.text}`}>{LEVEL_SIGN[v.level]}</span>
}

// One line that says what the badges mean, at the top of the Results pane and of the comparison.
export function StatusLegend() {
  return (
    <p className="status-legend">
      <Status v={{ level: 'ok', text: 'Meets your requirement or the default band' }} /> fine
      <Status v={{ level: 'warn', text: 'Check: outside a default band, at risk within the uncertainty, or not checked' }} /> check
      <Status v={{ level: 'bad', text: 'Breaks a requirement you set' }} /> fails a requirement
      <Help topic="warnings" />
    </p>
  )
}
