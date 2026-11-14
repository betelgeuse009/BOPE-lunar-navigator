import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '../data/api'
import type { ScaleMode } from '../ui/colors'

export type Mode = 'checking' | 'live' | 'static'
export type Point = { lat: number; lon: number }

type AppState = {
  dateIdx: number
  dateCount: number
  metric: string
  hoveredSite: string | null
  selectedSite: string | null
  mode: Mode
  settings: Settings
  point: Point | null       // clicked point to evaluate (live mode)
  radiusKm: number          // area search radius, 0 = off
  scaleMode: ScaleMode
  setDateIdx: (i: number) => void
  setDateCount: (n: number) => void
  setMetric: (m: string) => void
  setHovered: (id: string | null) => void
  setSelected: (id: string | null) => void
  setMode: (m: Mode) => void
  setSettings: (s: Partial<Settings>) => void
  setPoint: (p: Point | null) => void
  setRadiusKm: (r: number) => void
  setScaleMode: (m: ScaleMode) => void
}

const clamp = (i: number, n: number) => Math.min(Math.max(0, Math.round(i)), Math.max(0, n - 1))

export const useApp = create<AppState>((set) => ({
  dateIdx: 0,
  dateCount: 0,
  metric: 'score',
  hoveredSite: null,
  selectedSite: null,
  mode: 'checking',
  settings: DEFAULT_SETTINGS,
  point: null,
  radiusKm: 0,
  scaleMode: 'absolute',
  setDateIdx: (i) => set((s) => ({ dateIdx: clamp(i, s.dateCount) })),
  setDateCount: (n) => set((s) => ({ dateCount: n, dateIdx: clamp(s.dateIdx, n) })),
  setMetric: (metric) => set({ metric }),
  setHovered: (hoveredSite) => set({ hoveredSite }),
  setSelected: (selectedSite) => set({ selectedSite }),
  setMode: (mode) => set({ mode }),
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setPoint: (point) => set({ point }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setScaleMode: (scaleMode) => set({ scaleMode }),
}))
