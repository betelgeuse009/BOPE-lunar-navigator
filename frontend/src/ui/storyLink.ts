import { useEffect, useRef } from 'react'
import { useApp } from '../state/store'

type Story = { siteId: string; lat: number; lon: number; dayUtc: string; minuteUtc: number }

// Demo deep links: ?story=<id> opens a known case ready to present. Live mode only: the dates are outside the
// precomputed table.
const STORIES: Record<string, Story> = {
  // IM-2 Athena: landed point from LROC image 1408 (data/processed/sites.json). Landing 2025-03-06 about 17:30 UTC
  // (TODO: confirm the time against an Intuitive Machines / NASA statement).
  im2: { siteId: 'im-2-athena', lat: -84.7906, lon: 29.1957, dayUtc: '2025-03-06T00:00:00Z', minuteUtc: 17 * 60 + 30 },
}

export function useStoryLink(ready: boolean) {
  const mode = useApp((s) => s.mode)
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !ready || mode !== 'live') return
    const story = STORIES[new URLSearchParams(window.location.search).get('story') ?? '']
    if (!story) return
    done.current = true
    const app = useApp.getState()
    app.setSelected(story.siteId)
    app.setPoint({ lat: story.lat, lon: story.lon })
    app.setStripStart(story.dayUtc, 0)
    app.setMinuteUtc(story.minuteUtc)
  }, [ready, mode])
}
