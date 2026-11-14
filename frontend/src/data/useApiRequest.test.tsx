// @vitest-environment jsdom
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { useApiRequest } from './useLive'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('useApiRequest', () => {
  it('delivers the result under StrictMode (dev double mount)', async () => {
    let seen: { data: unknown; loading: boolean } = { data: null, loading: true }
    function Probe() {
      const r = useApiRequest(JSON.stringify({ q: '1' }), async (p) => `answer ${p.q}`)
      seen = r
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => { root.render(<StrictMode><Probe /></StrictMode>) })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(seen.data).toBe('answer 1')
    expect(seen.loading).toBe(false)
    root.unmount()
  })
})
