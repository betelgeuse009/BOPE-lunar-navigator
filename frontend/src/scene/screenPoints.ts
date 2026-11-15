import { create } from 'zustand'

// Screen positions (px, relative to the viewer) of the places the floating cards must not cover: the hovered known
// site and the chosen point. Written by the globe (scene/TrackScreenPoints.tsx) or the 2D map, read by MissionCard.
export type ScreenPt = { x: number; y: number }
export const useScreenPoints = create<{ pts: ScreenPt[]; setPts: (p: ScreenPt[]) => void }>((set) => ({
  pts: [],
  setPts: (pts) => set({ pts }),
}))
// Rounded to 8 px so small camera moves do not re-render the card.
export const ptsKey = (pts: ScreenPt[]) => pts.map((p) => `${Math.round(p.x / 8)},${Math.round(p.y / 8)}`).join(';')
