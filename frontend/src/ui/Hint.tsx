import { useId, useState, type ReactNode } from 'react'

// A short explanation shown while the pointer (or keyboard focus) is on its trigger. Two looks:
// an underlined word ("Info on views") or a small round (i) mark next to a name. Same card as the Help marks.
const CARD_W = 360

export function Hint({ label, title, mark = false, children }: { label: string; title?: string; mark?: boolean; children: ReactNode }) {
  const id = useId()
  const [at, setAt] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left - 12, window.innerWidth - CARD_W - 8))
    // Below the trigger, or above it when the trigger is in the lower part of the window.
    setAt(r.bottom > window.innerHeight * 0.6 ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 })
  }
  return (
    <span className="hint">
      <button type="button" className={mark ? 'hint-mark' : 'hint-link'} aria-label={mark ? `About: ${title ?? label}` : undefined}
        aria-describedby={at ? id : undefined}
        onMouseEnter={(e) => show(e.currentTarget)} onMouseLeave={() => setAt(null)}
        onFocus={(e) => show(e.currentTarget)} onBlur={() => setAt(null)}>{label}</button>
      {at && (
        <span className="help-card" role="tooltip" id={id} style={{ ...at, width: CARD_W }}>
          {title && <strong>{title}</strong>}
          <span>{children}</span>
        </span>
      )}
    </span>
  )
}
