import { useEffect, useState } from 'react'

export const CHAPTERS = [
  { id: 'where', title: 'Where' },
  { id: 'when', title: 'When' },
  { id: 'mission', title: 'Mission' },
  { id: 'verdict', title: 'Verdict' },
  { id: 'score', title: 'Score' },
] as const

// Sticky progress through the chapters: the one in view is marked; clicking jumps to a chapter.
export function ChapterNav({ root }: { root: HTMLElement | null }) {
  const [current, setCurrent] = useState<string>(CHAPTERS[0].id)
  useEffect(() => {
    if (!root) return
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setCurrent(top.target.id)
      },
      { root, rootMargin: '-20% 0px -60% 0px' },
    )
    CHAPTERS.forEach((c) => { const el = root.querySelector(`#${c.id}`); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [root])

  return (
    <nav className="chapter-nav" aria-label="Chapters">
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} aria-current={current === c.id ? 'step' : undefined}
              onClick={(e) => { e.preventDefault(); root?.querySelector(`#${c.id}`)?.scrollIntoView({ behavior: 'smooth' }) }}>
              <span className="nav-num">{i + 1}</span>{c.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
