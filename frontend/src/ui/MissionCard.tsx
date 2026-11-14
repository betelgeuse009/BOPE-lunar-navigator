import missions from '../data/missions.json'
import { useApp } from '../state/store'

type Mission = { title: string; summary: string; url: string; text_licence: string; image?: { file: string; credit: string; licence: string; source: string } }

// Shown while a known landing site is pointed at, in the list or on the Moon: one image and the opening of the
// mission's Wikipedia article. Text and images are downloaded once by scripts/fetch-missions.mjs and kept locally.
export function MissionCard() {
  const id = useApp((s) => s.hoveredSite)
  const m = id ? (missions as Record<string, Mission>)[id] : undefined
  if (!m) return null
  return (
    <aside className="mission-card" aria-label={m.title}>
      {m.image && <img src={`${import.meta.env.BASE_URL}${m.image.file}`} alt="" />}
      <div>
        <strong>{m.title}</strong>
        <p>{m.summary}</p>
        <small>
          Text: Wikipedia, {m.text_licence}.{m.image && ` Image: ${m.image.credit}, ${m.image.licence}.`}
        </small>
      </div>
    </aside>
  )
}
