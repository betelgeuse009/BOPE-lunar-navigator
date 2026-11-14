import { describe, expect, it } from 'vitest'
import { createLatestRunner } from './latest'

// A run we resolve by hand, to control timing.
function manualRun() {
  const calls: string[] = []
  const resolvers: (() => void)[] = []
  const run = (key: string) => { calls.push(key); return new Promise<string>((r) => resolvers.push(() => r(`result:${key}`))) }
  return { calls, resolvers, run }
}
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('createLatestRunner', () => {
  it('keeps one request in flight and then runs only the newest key', async () => {
    const m = manualRun()
    const results: string[] = []
    const r = createLatestRunner(m.run, (v) => results.push(v), () => {})
    r.request('a'); r.request('b'); r.request('c')   // drag: b and c arrive while a runs
    expect(m.calls).toEqual(['a'])
    m.resolvers[0](); await flush()
    expect(m.calls).toEqual(['a', 'c'])              // b skipped
    m.resolvers[1](); await flush()
    expect(results).toEqual(['result:c'])             // the stale result for 'a' is not shown
  })
  it('delivers the result when nothing newer was asked', async () => {
    const m = manualRun()
    const results: string[] = []
    const r = createLatestRunner(m.run, (v) => results.push(v), () => {})
    r.request('a'); m.resolvers[0](); await flush()
    expect(results).toEqual(['result:a'])
  })
  it('reports errors only for the newest key', async () => {
    const errors: string[] = []
    let n = 0
    const r = createLatestRunner(async (k: string) => { n++; if (k === 'bad') throw new Error('boom'); return k }, () => {}, (e) => errors.push(e.message))
    r.request('bad'); await flush()
    expect(errors).toEqual(['boom'])
    expect(n).toBe(1)
  })
  it('stops delivering after cancel', async () => {
    const m = manualRun()
    const results: string[] = []
    const r = createLatestRunner(m.run, (v) => results.push(v), () => {})
    r.request('a'); r.cancel(); m.resolvers[0](); await flush()
    expect(results).toEqual([])
  })
})
