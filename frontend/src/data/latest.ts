// "Latest only" request scheduling. The analysis server cannot cancel work, and a new landing date costs it
// about 2-3 s, so firing one request per slider step queues them all (measured: a click waited 53 s after a
// 15-date drag). This runner keeps at most one request in flight; keys asked for meanwhile replace each other,
// and when the request finishes only the newest key is run. Results of superseded keys are dropped.
export function createLatestRunner<K, T>(
  run: (key: K) => Promise<T>,
  onResult: (value: T) => void,
  onError: (error: Error) => void,
) {
  let busy = false
  let latest: K | undefined
  let hasPending = false
  let active = true

  async function pump(key: K) {
    busy = true
    hasPending = false
    try {
      const value = await run(key)
      if (active && !hasPending) onResult(value)
    } catch (e) {
      if (active && !hasPending) onError(e as Error)
    }
    busy = false
    if (active && hasPending) pump(latest as K)
  }

  return {
    request(key: K) {
      latest = key
      if (busy) hasPending = true
      else pump(key)
    },
    cancel() { active = false },
  }
}
