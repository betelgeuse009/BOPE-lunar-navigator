import { useId, useState, type ReactNode } from 'react'
import type { TopicId } from '../docs/topics'

// A short explanation shown while the pointer (or keyboard focus) is on its trigger. Two looks:
// an underlined word ("Info on views") or a small round (i) mark next to a name. Same card as the Help marks.
// With `topic`, the trigger is also a link: clicking it opens that documentation page (formulas, sources, criteria).
const CARD_W = 360

export function Hint({ label, title, mark = false, topic, children }: {
  label: string; title?: string; mark?: boolean; topic?: TopicId; children: ReactNode
}) {
  const id = useId()
  const [at, setAt] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left - 12, window.innerWidth - CARD_W - 8))
    // Below the trigger, or above it when the trigger is in the lower part of the window.
    setAt(r.bottom > window.innerHeight * 0.6 ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 })
  }
  const props = {
    className: mark ? 'hint-mark' : 'hint-link',
    'aria-label': mark ? `About: ${title ?? label}` : undefined,
    'aria-describedby': at ? id : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(e.currentTarget),
    onMouseLeave: () => setAt(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => show(e.currentTarget),
    onBlur: () => setAt(null),
  }
  return (
    <span className="hint">
      {topic
        ? <a href={`#/docs/${topic}`} {...props} onClick={(e) => e.currentTarget.blur()}>{label}</a>
        : <button type="button" {...props}>{label}</button>}
      {at && (
        <span className="help-card" role="tooltip" id={id} style={{ ...at, width: CARD_W }}>
          {title && <strong>{title}</strong>}
          <span>{children}</span>
          {topic && <em>Click for the full documentation: formulas, sources and landing criteria.</em>}
        </span>
      )}
    </span>
  )
}
