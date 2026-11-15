import { describe, expect, it } from 'vitest'
import { REFS, TOPICS, type TopicId } from './topics'

// Every statement on a documentation page must point to a reference that exists (rule: ui/Help.tsx, CLAUDE.md §8).
const texts = (id: TopicId) => {
  const t = TOPICS[id]
  return [t.summary, ...t.sections.flatMap((s) => [...(s.p ?? []), ...(s.table?.rows.flat() ?? [])])]
}

describe('documentation pages', () => {
  const ids = Object.keys(TOPICS) as TopicId[]
  it.each(ids)('%s: every [n] citation points to one of its references', (id) => {
    const n = TOPICS[id].refs.length
    const cited = texts(id).flatMap((x) => [...x.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
    for (const c of cited) expect(c, `[${c}] in ${id}, ${n} references`).toBeGreaterThanOrEqual(1)
    for (const c of cited) expect(c, `[${c}] in ${id}, ${n} references`).toBeLessThanOrEqual(n)
  })
  it.each(ids)('%s: has at least one reference, all of them known', (id) => {
    expect(TOPICS[id].refs.length).toBeGreaterThan(0)
    for (const r of TOPICS[id].refs) expect(REFS[r], r).toBeDefined()
  })
  it.each(ids)('%s: "see also" links lead to existing pages', (id) => {
    for (const s of TOPICS[id].seeAlso ?? []) expect(s in TOPICS, `${id} -> ${s}`).toBe(true)
  })
})
