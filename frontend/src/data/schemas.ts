// zod mirrors of contracts/schemas v0.1 (required fields only; optional fields pass through).
import { z } from 'zod'

export const CONTRACT_VERSION = '0.1'

const header = {
  contract_version: z.string(),
  generated_at: z.string(),
  source: z.object({
    datasets: z.array(z.object({ name: z.string(), version: z.string().optional(), url: z.string().optional() })),
    tool: z.string(),
    notes: z.string().optional(),
  }),
}

export const Manifest = z.object({
  ...header,
  periods: z.array(z.object({ id: z.string(), label: z.string().optional(), start_utc: z.string(), end_utc: z.string(), step_s: z.number() })),
  available: z.array(z.object({ site_id: z.string(), has_horizon: z.boolean(), period_ids: z.array(z.string()) })),
  has_matrix: z.boolean().optional(),
})

export const Sites = z.object({
  ...header,
  sites: z.array(z.object({
    id: z.string(),
    name: z.string(),
    lat_deg: z.number().min(-90).max(90),
    lon_deg: z.number().min(-180).max(180),
    category: z.string(),
    coord_source: z.string(),
    description: z.string().optional(),
  })),
})

const grid = z.array(z.array(z.number().nullable()))

export const Matrix = z.object({
  ...header,
  site_ids: z.array(z.string()),
  landing_dates_utc: z.array(z.string()),
  mission_duration_h: z.number(),
  sun_threshold_frac: z.number(),
  cells: z.object({ sunlit_frac: grid, earth_visible_frac: grid, both_frac: grid, longest_dark_h: grid }).catchall(grid),
  uncertainty_notes: z.string().optional(),
})

export type Manifest = z.infer<typeof Manifest>
export type Sites = z.infer<typeof Sites>
export type Site = Sites['sites'][number]
export type Matrix = z.infer<typeof Matrix>
