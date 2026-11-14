import type { z } from 'zod'
import { CONTRACT_VERSION, Manifest, Matrix, Sites } from './schemas'

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

export function isFixture(header: { source?: { notes?: string } }): boolean {
  return header.source?.notes?.includes('FIXTURE') ?? false
}
