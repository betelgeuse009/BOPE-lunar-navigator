import 'katex/dist/katex.min.css'
import { useEffect } from 'react'
import { Equation, Rich } from './Rich'
import { CATEGORIES, REFS, TOPICS, type TopicId } from './topics'

const ids = Object.keys(TOPICS) as TopicId[]

// Reference documentation: categories on the left, one topic per page with its method, limits and sources.
export function DocsPage({ topic }: { topic: TopicId }) {
  const t = TOPICS[topic]
  useEffect(() => { document.querySelector('.docs-main')?.scrollTo(0, 0) }, [topic])
  return (
    <div className="docs">
      <header className="docs-top">
        <a href="#/">‹ Back to the navigator</a>
        <span>Documentation</span>
      </header>
      <nav className="docs-nav" aria-label="Documentation topics">
        {CATEGORIES.map((c) => (
          <section key={c}>
            <h2>{c}</h2>
            <ul>
              {ids.filter((id) => TOPICS[id].category === c).map((id) => (
                <li key={id}><a href={`#/docs/${id}`} aria-current={id === topic ? 'page' : undefined}>{TOPICS[id].title}</a></li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <main className="docs-main">
        {/* A citation [n] in the text jumps to reference n at the foot of the page. */}
        <article onClick={(e) => {
          const n = (e.target as HTMLElement).dataset?.ref
          if (!n) return
          e.preventDefault()
          document.getElementById(`ref-${n}`)?.scrollIntoView({ block: 'center' })
        }}>
          <p className="docs-crumb">{t.category}</p>
          <h1>{t.title}</h1>
          <div className="docs-summary"><Rich as="p" text={t.summary} /></div>
          {t.sections.map((s) => (
            <section key={s.h} className="numbered">
              <h2>{s.h}</h2>
              {/* An equation follows the sentence that introduces it; its symbols are explained after it. */}
              {s.p?.map((p, i) => [<Rich key={i} as="p" text={p} />, i === 0 && s.eq && <Equation key="eq" tex={s.eq} />])}
              {s.table && (
                <div className="docs-table">
                  <table>
                    <thead><tr>{s.table.head.map((h, i) => <Rich key={i} as="th" text={h} />)}</tr></thead>
                    <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <Rich key={j} as="td" text={c} />)}</tr>)}</tbody>
                  </table>
                </div>
              )}
              {s.eq && !s.p && <Equation tex={s.eq} />}
            </section>
          ))}
          <section>
            <h2>References</h2>
            <ol className="docs-refs">
              {t.refs.map((r, i) => {
                const ref: { text: string; url?: string } = REFS[r]
                return <li key={r} id={`ref-${i + 1}`}>{ref.text}{ref.url && <> <a href={ref.url} target="_blank" rel="noreferrer">{ref.url}</a></>}</li>
              })}
            </ol>
          </section>
          {t.seeAlso && (
            <section>
              <h2>See also</h2>
              <p className="docs-see">
                {t.seeAlso.map((id) => <a key={id} href={`#/docs/${id}`}>{TOPICS[id as TopicId].title}</a>)}
              </p>
            </section>
          )}
        </article>
      </main>
    </div>
  )
}
