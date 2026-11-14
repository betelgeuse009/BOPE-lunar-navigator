import { create } from 'zustand'

type AppState = {
  dateIdx: number
  dateCount: number
  metric: string
  hoveredSite: string | null
  selectedSite: string | null
  setDateIdx: (i: number) => void
  setDateCount: (n: number) => void
  setMetric: (m: string) => void
  setHovered: (id: string | null) => void
  setSelected: (id: string | null) => void
}

const clamp = (i: number, n: number) => Math.min(Math.max(0, Math.round(i)), Math.max(0, n - 1))

export const useApp = create<AppState>((set) => ({
  dateIdx: 0,
  dateCount: 0,
  metric: 'both_frac',
  hoveredSite: null,
  selectedSite: null,
  setDateIdx: (i) => set((s) => ({ dateIdx: clamp(i, s.dateCount) })),
  setDateCount: (n) => set((s) => ({ dateCount: n, dateIdx: clamp(s.dateIdx, n) })),
  setMetric: (metric) => set({ metric }),
  setHovered: (hoveredSite) => set({ hoveredSite }),
  setSelected: (selectedSite) => set({ selectedSite }),
}))
