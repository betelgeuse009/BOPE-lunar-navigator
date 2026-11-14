import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '../data/api'
import type { ScaleMode } from '../ui/colors'

export type Mode = 'checking' | 'live' | 'static'
export type Point = { lat: number; lon: number }
// A place pinned for comparison, with the landing date and hour it was pinned at. siteId is set for catalogue sites.
export type Pin = { id: string; label: string; lat: number; lon: number; dateIdx: number; hourUtc: number; siteId?: string }
export const MAX_PINS = 4

type AppState = {
  dateIdx: number
  dateCount: number
  hourUtc: number          // landing hour of day, UTC (live mode; offline data is at 00:00)
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
  setDateIdx: (i: number) => void
  setDateCount: (n: number) => void
  setHourUtc: (h: number) => void
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
  hourUtc: 0,
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
  setDateIdx: (i) => set((s) => ({ dateIdx: clamp(i, s.dateCount) })),
  setDateCount: (n) => set((s) => ({ dateCount: n, dateIdx: clamp(s.dateIdx, n) })),
  setHourUtc: (hourUtc) => set({ hourUtc }),
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
