import { useState } from 'react'
import { TOPICS, type TopicId } from '../docs/topics'

// Interface rule (FE, 2026-11-14): everything added to the Mission setup or Results pane (a value, a switch,
// a button, a block) gets a Help mark next to it. Hovering or focusing it shows a short explanation; clicking it
// opens the full documentation page for that topic, which must exist in docs/topics.ts with its sources.
const CARD_W = 320

export function Help({ topic }: { topic: TopicId }) {
  const t = TOPICS[topic]
  const [at, setAt] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left - 12, window.innerWidth - CARD_W - 8))
    // Below the mark, or above it when the mark is in the lower part of the window.
    setAt(r.bottom > window.innerHeight * 0.6 ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 })
  }
  const id = `help-${topic}`
  return (
    <span className="help">
      <a href={`#/docs/${topic}`} aria-label={`Help: ${t.title}`} aria-describedby={at ? id : undefined}
        onMouseEnter={(e) => show(e.currentTarget)} onMouseLeave={() => setAt(null)}
        onFocus={(e) => show(e.currentTarget)} onBlur={() => setAt(null)} onClick={(e) => e.currentTarget.blur()}>?</a>
      {at && (
        <span className="help-card" role="tooltip" id={id} style={{ ...at, width: CARD_W }}>
          <strong>{t.title}</strong>
          <span>{t.summary}</span>
          <em>Click the mark for the full documentation.</em>
        </span>
      )}
    </span>
  )
}
