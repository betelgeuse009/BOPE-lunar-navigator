import type { Matrix, Site } from '../data/schemas'
import { Catalogue } from './Catalogue'
import { DateRail } from './DateRail'
import { MissionAnimation } from './MissionAnimation'
import { Block } from './Pane'
import { PlaceInput } from './PlaceInput'
import { MissionSettings, NearbySearch, ScoreSettings } from './SettingsPanel'
import { TimeRail } from './TimeRail'

// Left pane: everything the user sets. It writes to the store and never shows results.
export function InputPanel({ sites, matrix, landingDate }: {
  sites: Site[]; matrix: Matrix; landingDate: string | undefined
}) {
  return (
    <>
      <Block title="Place" help="coordinates">
        <PlaceInput />
      </Block>
      <Block title="Landing time" help="landing-time">
        <DateRail matrix={matrix} />
        {landingDate && <TimeRail dateUtc={landingDate} />}
        <MissionAnimation />
      </Block>
      <Block title="Mission" help="mission-type">
        <MissionSettings />
      </Block>
      <Block title="Score weights" help="score-weights" open={false}>
        <ScoreSettings />
      </Block>
      <Block title="Search nearby" help="nearby-search" open={false}>
        <NearbySearch />
      </Block>
      <Block title="Known landing sites" help="known-sites">
        <Catalogue sites={sites} matrix={matrix} />
      </Block>
    </>
  )
}
