import type { ReactNode } from 'react'
import type { TopicId } from '../../docs/topics'
import { Help } from '../Help'
import { Status } from '../Status'
import type { Verdict } from '../warnings'

// A list of named values. Every row carries its help mark (rule: ui/Help.tsx).
export function Rows({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <>
      {title && <h3 className="rows-title">{title}</h3>}
      <dl className="rows">{children}</dl>
    </>
  )
}

// `status`: warning level of the value (ui/warnings.ts), shown as a badge after it.
export function Row({ label, help, children, status }: { label: string; help: TopicId; children: ReactNode; status?: Verdict | null }) {
  return (
    <div className={status ? `has-status level-${status.level}` : undefined}>
      <dt>{label} <Help topic={help} /></dt>
      <dd>{children}<Status v={status} /></dd>
    </div>
  )
}
