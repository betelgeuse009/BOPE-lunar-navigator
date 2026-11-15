// Feature names for the "Labels" switch (globe and 2D map). Data: public/labels/moon_names.json, made by
// scripts/nomenclature.py from the IAU / USGS Gazetteer of Planetary Nomenclature. Display only.
//
// Which names show: a name appears once its feature is at least MIN_FEATURE_PX across on the screen, so zooming in
// brings in smaller features; names are placed largest feature first and a name that would overlap one already placed
// is left out. Labels are drawn at a fixed size in screen pixels, so zooming never scales them.
export type FeatureName = { name: string; lat: number; lon: number; dKm: number; code: string }
export type NamesFile = { source: string; generated_at: string; fields: string[]; names: [string, number, number, number, string][] }

export const MIN_FEATURE_PX = 28
export const MAX_LABELS = 70
// Point features (diameter 0 in the gazetteer, e.g. Statio Shiv Shakti) count as this size, so they show when zoomed in.
export const POINT_FEATURE_KM = 5
// Maria and other "sea" type names (mare, oceanus, lacus, sinus, palus) get the italic style of lunar maps.
const SEA = new Set(['ME', 'OC', 'LC', 'SI', 'PA'])
export const isSea = (code: string) => SEA.has(code)

export function parseNames(f: NamesFile): FeatureName[] {
  return f.names.map(([name, lat, lon, dKm, code]) => ({ name, lat, lon, dKm: Math.max(dKm, POINT_FEATURE_KM), code }))
}

// Approximate box of a label on screen (px), centred on its point.
const CHAR_PX = 7, LINE_PX = 15, PAD = 4
export const labelBox = (name: string, x: number, y: number) => {
  const w = name.length * CHAR_PX + PAD * 2
  return { x0: x - w / 2, x1: x + w / 2, y0: y - LINE_PX / 2, y1: y + LINE_PX / 2 }
}

// Greedy placement: candidates in priority order (largest first) with their screen position and size on screen.
// Labels must fit inside `area` (screen px), the part of the view not covered by the controls. Returns the indexes kept.
export type ScreenArea = { x0: number; y0: number; x1: number; y1: number }
export function placeLabels(c: { i: number; name: string; x: number; y: number; px: number }[], area: ScreenArea,
  max = MAX_LABELS): number[] {
  const kept: number[] = [], boxes: ReturnType<typeof labelBox>[] = []
  for (const k of c) {
    if (kept.length >= max) break
    if (k.px < MIN_FEATURE_PX) continue
    const b = labelBox(k.name, k.x, k.y)
    if (b.x0 < area.x0 || b.y0 < area.y0 || b.x1 > area.x1 || b.y1 > area.y1) continue
    if (boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0)) continue
    kept.push(k.i); boxes.push(b)
  }
  return kept
}

// The part of the view (`view`, its container) left free by the header and the controls at the bottom.
export function freeArea(view: Element): ScreenArea {
  const v = view.getBoundingClientRect()
  const stage = view.closest('.stage') ?? view
  const tops = [...stage.querySelectorAll('.stage-top > *')].map((e) => e.getBoundingClientRect().bottom - v.top)
  const foots = [...stage.querySelectorAll('.stage-foot > *')].map((e) => e.getBoundingClientRect().top - v.top)
  return { x0: 0, y0: Math.max(0, ...tops) + 4, x1: v.width, y1: Math.min(v.height, ...foots) - 4 }
}
