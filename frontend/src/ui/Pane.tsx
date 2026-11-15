import { useState, type ReactNode } from 'react'
import type { TopicId } from '../docs/topics'
import { Help } from './Help'

// A side pane of the workbench. Collapsed, it shrinks to a rail that keeps only its toggle.
export function Pane({ side, title, open, onToggle, children }: {
  side: 'left' | 'right'; title: string; open: boolean; onToggle: () => void; children: ReactNode
}) {
  const id = `pane-${side}`
  // The arrow points the way the pane will move.
  const arrow = (side === 'left') === open ? '‹' : '›'
  return (
    <aside className={`pane pane-${side}${open ? '' : ' closed'}`} aria-label={title}>
      <button type="button" className="pane-toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}
        title={open ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}>
        <span className="pane-title">{title}</span>
        <span aria-hidden>{arrow}</span>
      </button>
      <div className="pane-body" id={id} hidden={!open}>{children}</div>
    </aside>
  )
}

// One self-contained block inside a pane. New features are added as new blocks.
// `lazy`: the content is mounted only once the block is opened (for blocks that ask the server for more data).
export function Block({ title, help, open = true, lazy = false, children }: { title: string; help: TopicId; open?: boolean; lazy?: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(open)
  return (
    <details className="block" open={open} onToggle={(e) => e.currentTarget.open && setShown(true)}>
      <summary><span>{title} <Help topic={help} /></span></summary>
      <div className="block-body">{!lazy || shown ? children : null}</div>
    </details>
  )
}
