import type { z } from 'zod'
import { CONTRACT_VERSION, Manifest, Matrix, Scene, Sites } from './schemas'

export function parseFile<S extends z.ZodTypeAny>(schema: S, json: unknown, name: string): z.infer<S> {
  const version = (json as { contract_version?: unknown } | null)?.contract_version
  if (version !== CONTRACT_VERSION) throw new Error(`${name}: contract_version ${String(version)}, expected ${CONTRACT_VERSION}`)
  const r = schema.safeParse(json)
  if (!r.success) throw new Error(`${name}: ` + r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '))
  return r.data
}

async function fetchJson(base: string, name: string): Promise<unknown> {
  const res = await fetch(base + name)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${base}`)
  return res.json()
}

export async function loadAll(base: string) {
  const [m, s, x] = await Promise.all(['manifest.json', 'sites.json', 'matrix.json'].map((n) => fetchJson(base, n)))
  return {
    manifest: parseFile(Manifest, m, 'manifest.json'),
    sites: parseFile(Sites, s, 'sites.json'),
    matrix: parseFile(Matrix, x, 'matrix.json'),
  }
}

export function cellValue(matrix: Matrix, siteId: string, field: string, dateIdx: number): number | null {
  const i = matrix.site_ids.indexOf(siteId)
  return matrix.cells[field]?.[i]?.[dateIdx] ?? null
}

// FE fixtures say FIXTURE, AERO's development data says SAMPLE DATA: both get the "preliminary" tag in the UI.
export function isPreliminary(header: { source?: { notes?: string } }): boolean {
  return /FIXTURE|SAMPLE/.test(header.source?.notes ?? '')
}

export async function loadScene(base: string, periodId: string): Promise<Scene> {
  const name = `scene/${periodId}.json`
  return parseFile(Scene, await fetchJson(base, name), name)
}

export function periodAt(manifest: Manifest, timeUtc: string): Manifest['periods'][number] | null {
  const t = Date.parse(timeUtc)
  return manifest.periods.find((p) => Date.parse(p.start_utc) <= t && t < Date.parse(p.end_utc)) ?? null
}

// Nearest time step (series are strictly increasing with a uniform step, per the contract).
export function sceneIndexAt(scene: Scene, timeUtc: string): number {
  const t0 = Date.parse(scene.time_utc[0])
  const step = Date.parse(scene.time_utc[1]) - t0
  const i = Math.round((Date.parse(timeUtc) - t0) / step)
  return Math.min(Math.max(i, 0), scene.time_utc.length - 1)
}
