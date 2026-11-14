import type { ReactNode } from 'react'
import type { TopicId } from '../../docs/topics'
import { Help } from '../Help'

// A list of named values. Every row carries its help mark (rule: ui/Help.tsx).
export function Rows({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <>
      {title && <h3 className="rows-title">{title}</h3>}
      <dl className="rows">{children}</dl>
    </>
  )
}

export function Row({ label, help, children }: { label: string; help: TopicId; children: ReactNode }) {
  return <div><dt>{label} <Help topic={help} /></dt><dd>{children}</dd></div>
}
