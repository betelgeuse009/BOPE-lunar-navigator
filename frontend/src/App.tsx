import { useEffect, useMemo, useState } from 'react'
import { isPreliminary, landingAt, loadAll, loadScene, periodAt, sceneIndexAt } from './data/load'
import type { Scene } from './data/schemas'
import { useApiHealth, useAreaSearch, useEvaluation, useLiveMatrix } from './data/useLive'
import { DocsPage } from './docs/DocsPage'
import { useDocTopic } from './docs/useDocTopic'
import { Viewport } from './scene/Viewport'
import { useApp } from './state/store'
import { ComparePanel } from './ui/ComparePanel'
import { InputPanel } from './ui/InputPanel'
import { OutputPanel } from './ui/OutputPanel'
import { Pane } from './ui/Pane'

// public/data/ is filled by scripts/sync-data.mjs from data/processed/ (or data/samples/ until AERO publishes)
const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? `${import.meta.env.BASE_URL}data/`
type Data = Awaited<ReturnType<typeof loadAll>>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const { metric, dateIdx, minuteUtc, mode, setMetric, setDateCount } = useApp()
  useApiHealth()
  const docTopic = useDocTopic()

  useEffect(() => {
    loadAll(DATA_BASE)
      .then((d) => { setData(d); setDateCount(d.matrix.landing_dates_utc.length) })
      .catch((e: Error) => setError(e.message))
  }, [setDateCount])

  // Landing time: the chosen date at the chosen time of day (live only; the offline files are computed at 00:00 UTC).
  const landingDate = data?.matrix.landing_dates_utc[dateIdx]
  const landingUtc = landingDate && landingAt(landingDate, mode === 'live' ? minuteUtc : 0)
  // Scene file (sub-solar point over time) for the month that contains the selected landing time.
  const periodId = data && landingUtc && data.manifest.has_scene ? periodAt(data.manifest, landingUtc)?.id : undefined
  useEffect(() => {
    if (!periodId) return setScene(null)
    let live = true
    loadScene(DATA_BASE, periodId).then((s) => live && setScene(s)).catch(() => live && setScene(null))
    return () => { live = false }
  }, [periodId])
  // Live mode: matrix recomputed with the user's settings; otherwise the precomputed file.
  const siteIds = useMemo(() => data?.sites.sites.map((s) => s.id) ?? [], [data])
  const live = useLiveMatrix(data?.matrix ?? null, siteIds)
  const matrix = live.data ?? data?.matrix ?? null
  useEffect(() => {
    if (matrix && !(metric in matrix.cells)) setMetric('both_frac')
  }, [matrix, metric, setMetric])
  const ev = useEvaluation(landingUtc)
  const area = useAreaSearch(landingUtc)

  const i = scene && landingUtc ? sceneIndexAt(scene, landingUtc) : -1
  const subsolar = scene && i >= 0 ? { lat: scene.subsolar_lat_deg[i], lon: scene.subsolar_lon_deg[i] } : null

  // Layout: three isolated regions. Inputs (left) write the store, the viewport (centre) draws it,
  // outputs (right) show the server's answers. Both side panes collapse.
  return (
    <div className="app">
      <Pane side="left" title="Mission setup" open={leftOpen} onToggle={() => setLeftOpen(!leftOpen)}>
        {mode === 'static' && (
          <p className="error">
            Settings are locked because the analysis server is not running. Start it with <code>npm run api</code> and reload.
          </p>
        )}
        {data && matrix && <InputPanel sites={data.sites.sites} matrix={matrix} landingDate={landingDate} siteIds={siteIds} />}
      </Pane>

      <Viewport sites={data?.sites.sites ?? null} matrix={matrix} area={area.data} subsolar={subsolar} updating={live.loading} />

      <Pane side="right" title="Results" open={rightOpen} onToggle={() => setRightOpen(!rightOpen)}>
        {error && <p className="error" role="alert">Could not load the site data. {error}</p>}
        {live.error && <p className="error" role="alert">Live analysis failed: {live.error}. Showing precomputed data.</p>}
        {mode === 'static' && <p className="error">Offline: site colours use precomputed values with the default settings.</p>}
        {matrix && isPreliminary(matrix) && (
          <p className="fixture" title={matrix.source.notes}>Preliminary data: {matrix.source.notes}</p>
        )}
        {data && matrix && <OutputPanel sites={data.sites.sites} matrix={matrix} ev={ev} area={area} />}
      </Pane>

      {data && matrix && <ComparePanel matrix={matrix} />}
      {docTopic && <DocsPage topic={docTopic} />}
    </div>
  )
}
