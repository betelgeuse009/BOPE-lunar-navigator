import type { Area, Evaluation } from '../data/api'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { EvaluationPanel } from './EvaluationPanel'
import { Block } from './Pane'
import { SitePanel } from './SitePanel'

type Request<T> = { data: T | null; loading: boolean; error: string | null }

// Right pane: results for the chosen place. It reads the store and the server's answers and sets nothing.
export function OutputPanel({ sites, matrix, ev, area }: {
  sites: Site[]; matrix: Matrix; ev: Request<Evaluation>; area: Request<Area>
}) {
  const { point, mode } = useApp()
  return (
    <>
      <Block title="Can we land there?">
        {point
          ? <EvaluationPanel ev={ev.data} loading={ev.loading} error={ev.error}
              area={area.data} areaLoading={area.loading} areaError={area.error} />
          : <p className="note">{mode === 'live' ? 'Choose a known landing site or click anywhere on the Moon.' : 'Needs the analysis server (live mode).'}</p>}
      </Block>
      <Block title="Site record">
        <SitePanel sites={sites} matrix={matrix} />
      </Block>
    </>
  )
}
