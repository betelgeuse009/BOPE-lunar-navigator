import { useId, useState, type KeyboardEvent } from 'react'
import type { Site } from '../data/schemas'
import { useNames } from '../scene/useNames'
import { MAX_PINS, landingDay, useApp } from '../state/store'
import { Help } from './Help'
import { search, type Hit } from './search'

// Top of the viewer, like a map app: search a known landing site, a named feature (IAU) or coordinates and go there.
// "A/B" adds a second field: as soon as both places are chosen they are compared side by side (the Compare panel, at
// the landing date and time on the rails). A field picks its best match when you leave it without choosing from the list.
export function SearchBar({ sites }: { sites: Site[] | null }) {
  const { mode, dateIdx, minuteUtc, setPoint, setSelected, addPin, removePin, setCompareOpen } = useApp()
  const dateUtc = useApp(landingDay)
  const [used, setUsed] = useState(false) // the feature names (80 kB) load on first use
  const names = useNames(used)
  const [ab, setAb] = useState(false)
  const [a, setA] = useState<Hit | null>(null)
  const [b, setB] = useState<Hit | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const live = mode === 'live'

  const go = (h: Hit) => {
    setNote(null)
    setSelected(h.siteId ?? null)
    if (live) setPoint({ lat: h.lat, lon: h.lon })
    else if (!h.siteId) setNote('Places other than the known sites need the analysis server.')
  }
  // Called with the two places directly (the state of this render may not have them yet).
  const compare = (a: Hit | null, b: Hit | null) => {
    if (!a || !b || !dateUtc) return
    if (!live && !(a.siteId && b.siteId)) return setNote('Offline only the known sites can be compared.')
    useApp.getState().pins.filter((p) => /^[AB] · /.test(p.label)).forEach((p) => removePin(p.id))
    const left = useApp.getState().pins.length
    if (left > MAX_PINS - 2) return setNote(`The comparison is full (${MAX_PINS}): remove a column first.`)
    const m = live ? minuteUtc : 0
    for (const [tag, h] of [['A', a], ['B', b]] as const) {
      addPin({ id: `${h.siteId ?? `${h.lat.toFixed(4)},${h.lon.toFixed(4)}`}@${dateUtc}T${m}#${tag}`, label: `${tag} · ${h.label}`,
        lat: h.lat, lon: h.lon, dateIdx, dateUtc, minuteUtc: m, siteId: h.siteId })
    }
    setNote(null)
    setCompareOpen(true)
  }

  return (
    <div className={`search${ab ? ' search-ab' : ''}`} onFocus={() => setUsed(true)}>
      <SearchField tag={ab ? 'A' : null} sites={sites} names={names}
        onPick={(h) => { go(h); if (ab) { setA(h); compare(h, b) } }} onClear={() => setA(null)} />
      {ab && <SearchField tag="B" sites={sites} names={names}
        onPick={(h) => { go(h); setB(h); compare(a, h) }} onClear={() => setB(null)} />}
      {ab && (!a || !b) && <p className="search-hint">Choose {!a && !b ? 'A and B' : !a ? 'A' : 'B'}: the comparison opens by itself.</p>}
      <button type="button" className="search-ab-toggle" aria-pressed={ab} onClick={() => { setAb(!ab); setNote(null) }}
        title="Compare two places: A and B">A/B</button>
      <Help topic="search" />
      {note && <p className="search-note" role="status">{note}</p>}
    </div>
  )
}

function SearchField({ tag, sites, names, onPick, onClear }: {
  tag: 'A' | 'B' | null; sites: Site[] | null; names: ReturnType<typeof useNames>; onPick: (h: Hit) => void; onClear?: () => void
}) {
  const id = useId()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null) // label of the place chosen in this field
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const hits = open ? search(q, sites ?? [], names) : []
  const pick = (h: Hit) => { onPick(h); setQ(h.label); setPicked(h.label); setOpen(false) }
  // A/B fields: leaving the field with typed text that was not chosen from the list picks the best match.
  const leave = () => window.setTimeout(() => {
    setOpen(false)
    if (!tag || !q.trim() || q === picked) return
    const best = search(q, sites ?? [], names)[0]
    if (best) pick(best)
  }, 150)
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); pick(hits[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }
  return (
    <div className="search-field">
      {tag && <span className={`search-tag tag-${tag}`} aria-hidden>{tag}</span>}
      <input type="search" role="combobox" aria-expanded={hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={hits.length ? `${id}-${active}` : undefined}
        aria-label={tag ? `Place ${tag}: search a site, a crater or coordinates` : 'Search a site, a crater or coordinates'}
        placeholder={tag ? `Place ${tag}: site, crater or lat, lon` : 'Search a site, a crater or lat, lon'}
        value={q} onKeyDown={key} onBlur={leave} onFocus={() => q && setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value); setOpen(true); setActive(0)
          if (!e.target.value.trim()) { setPicked(null); onClear?.() }
        }} />
      {hits.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="search-list">
          {hits.map((h, i) => (
            <li key={`${h.kind}${h.label}${h.lat}`} id={`${id}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(h) }} onMouseEnter={() => setActive(i)}>
              <span className={`search-kind kind-${h.kind}`} aria-hidden>{h.kind === 'site' ? '◆' : h.kind === 'coords' ? '⌖' : '○'}</span>
              <span><strong>{h.label}</strong><small>{h.sub}</small></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
