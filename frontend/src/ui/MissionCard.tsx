import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import missions from '../data/missions.json'
import { freeArea } from '../scene/labels'
import { useScreenPoints } from '../scene/screenPoints'
import { useApp } from '../state/store'
import { pickCorner, type Corner } from './cardPlacement'

type Mission = { title: string; summary: string; url: string; text_licence: string; image?: { file: string; credit: string; licence: string; source: string } }

// Shown while a known landing site is pointed at, in the list or on the Moon: one image and the opening of the
// mission's Wikipedia article. Text and images are downloaded once by scripts/fetch-missions.mjs and kept locally.
// It sits in the corner of the view farthest from the hovered site and the chosen point (ui/cardPlacement.ts), so it
// never hides them.
export function MissionCard() {
  const id = useApp((s) => s.hoveredSite)
  const m = id ? (missions as Record<string, Mission>)[id] : undefined
  const pts = useScreenPoints((s) => s.pts)
  const ref = useRef<HTMLElement>(null)
  const [place, setPlace] = useState<{ corner: Corner; style: CSSProperties }>({ corner: 'tl', style: {} })
  useLayoutEffect(() => {
    const el = ref.current, stage = el?.closest('.stage')
    if (!el || !stage) return
    const area = freeArea(stage), r = el.getBoundingClientRect(), h = stage.getBoundingClientRect().height
    setPlace((p) => {
      const corner = pickCorner(pts, area, r.width, r.height, p.corner)
      const style: CSSProperties = {
        ...(corner[0] === 't' ? { top: area.y0 + 8, bottom: 'auto' } : { top: 'auto', bottom: h - area.y1 + 8 }),
        ...(corner[1] === 'l' ? { left: 16, right: 'auto' } : { left: 'auto', right: 16 }),
      }
      return p.corner === corner && JSON.stringify(p.style) === JSON.stringify(style) ? p : { corner, style }
    })
  }, [pts, id])
  if (!m) return null
  return (
    <aside ref={ref} className="mission-card" aria-label={m.title} style={place.style}>
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
