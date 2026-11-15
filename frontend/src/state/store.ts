import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '../data/api'
import { addDays } from '../data/load'
import type { LayerId } from '../scene/layers'
import type { ScaleMode } from '../ui/colors'

export type Mode = 'checking' | 'live' | 'static'
export type Point = { lat: number; lon: number }
// A place pinned for comparison, with the landing day (dateUtc) and time of day it was pinned at. siteId is set for
// catalogue sites; dateIdx is the day's column in the precomputed table (offline values).
export type Pin = { id: string; label: string; lat: number; lon: number; dateIdx: number; dateUtc: string; minuteUtc: number; siteId?: string }
// Live mode: the date strip shows this many days from the day chosen in the calendar.
export const STRIP_DAYS = 30
export const MAX_PINS = 4

type AppState = {
  dateIdx: number
  dateCount: number
  staticDates: string[]     // landing days of the precomputed table
  stripStart: string | null // first day of the date strip, chosen in the calendar (live mode); null = the table's first day
  minuteUtc: number        // landing time of day, minutes after 00:00 UTC (live mode; offline data is at 00:00)
  metric: string
  hoveredSite: string | null
  selectedSite: string | null
  mode: Mode
  settings: Settings
  point: Point | null       // clicked point to evaluate (live mode)
  radiusKm: number          // area search radius, 0 = off
  scaleMode: ScaleMode
  pins: Pin[]
  compareOpen: boolean
  layer: LayerId | null     // map layer drawn over the Moon
  setLayer: (l: LayerId | null) => void
  surfaceOpen: boolean      // the surface view of the chosen place is open
  setSurfaceOpen: (open: boolean) => void
  setDateIdx: (i: number) => void
  setDateCount: (n: number) => void
  setStaticDates: (d: string[]) => void
  setStripStart: (d: string) => void
  setMinuteUtc: (m: number) => void
  setMetric: (m: string) => void
  setHovered: (id: string | null) => void
  setSelected: (id: string | null) => void
  setMode: (m: Mode) => void
  setSettings: (s: Partial<Settings>) => void
  setPoint: (p: Point | null) => void
  setRadiusKm: (r: number) => void
  setScaleMode: (m: ScaleMode) => void
  addPin: (p: Pin) => void
  removePin: (id: string) => void
  setCompareOpen: (open: boolean) => void
}

const clamp = (i: number, n: number) => Math.min(Math.max(0, Math.round(i)), Math.max(0, n - 1))

export const useApp = create<AppState>((set) => ({
  dateIdx: 0,
  dateCount: 0,
  staticDates: [],
  stripStart: null,
  minuteUtc: 0,
  metric: 'score',
  hoveredSite: null,
  selectedSite: null,
  mode: 'checking',
  settings: DEFAULT_SETTINGS,
  point: null,
  radiusKm: 0,
  scaleMode: 'absolute',
  pins: [],
  compareOpen: false,
  layer: null,
  setLayer: (layer) => set({ layer }),
  surfaceOpen: false,
  setSurfaceOpen: (surfaceOpen) => set({ surfaceOpen }),
  setDateIdx: (i) => set((s) => ({ dateIdx: clamp(i, s.dateCount) })),
  setDateCount: (n) => set((s) => ({ dateCount: n, dateIdx: clamp(s.dateIdx, n) })),
  setStaticDates: (staticDates) => set({ staticDates }),
  setStripStart: (stripStart) => set({ stripStart, dateIdx: 0 }),
  setMinuteUtc: (minuteUtc) => set({ minuteUtc }),
  setMetric: (metric) => set({ metric }),
  setHovered: (hoveredSite) => set({ hoveredSite }),
  setSelected: (selectedSite) => set({ selectedSite }),
  setMode: (mode) => set({ mode }),
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setPoint: (point) => set({ point }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setScaleMode: (scaleMode) => set({ scaleMode }),
  addPin: (p) => set((s) => (s.pins.length >= MAX_PINS || s.pins.some((q) => q.id === p.id) ? {} : { pins: [...s.pins, p] })),
  removePin: (id) => set((s) => ({ pins: s.pins.filter((p) => p.id !== id) })),
  setCompareOpen: (compareOpen) => set({ compareOpen }),
}))

// The chosen landing day (00:00 UTC). Live: counted from the calendar's day; offline: a day of the precomputed table.
export function landingDay(s: Pick<AppState, 'mode' | 'stripStart' | 'staticDates' | 'dateIdx'>): string | undefined {
  if (s.mode !== 'live') return s.staticDates[s.dateIdx]
  const first = s.stripStart ?? s.staticDates[0]
  return first && addDays(first, s.dateIdx)
}
