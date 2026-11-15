import data from '../data/layers.json'
import type { TopicId } from '../docs/topics'

// Map layers. Image layers are NASA maps (or values computed by the analysis) redrawn as transparent images by
// scripts/layers.py; the numbers in the wording (ranges, counts) come from that script's output, src/data/layers.json.
// Every image layer covers the whole Moon (`global`) and has a finer south polar cap (`cap` for the globe, `strip`
// for the 2D map). Two layers are drawn live: the day/night line and the score map (asked from the analysis server).
// `how` is what the (i) next to the layer name shows: where the values come from or how they are calculated.
export type LayerId = 'altitude' | 'slope' | 'sun_visibility' | 'earth_visibility' | 'psr'
  | 'temperature_max' | 'temperature_avg' | 'rock_abundance' | 'h_parameter' | 'daynight' | 'score'
export type Layer = {
  id: LayerId; label: string; kind: 'image' | 'daynight' | 'score'
  global?: string; cap?: string; strip?: string
  legend: string[] | null   // labels spread evenly under the colour bar: lowest, middle, highest (scaleLabels)
  how: string
  doc: TopicId              // documentation page: formulas, sources, landing criteria
}

export const LAYER_CAP_DEG: number = data.cap_deg
export const LAYER_STRIP_DEG: number = data.strip_deg
// Score layer: the whole Moon on a grid (smooth-sphere horizon), plus a finer disc around the south pole with the
// terrain skyline (out to 80 S, one point every 15 km).
export const SCORE_GRID_DEG = 4
export const SCORE_MAP = { radiusKm: 300, spacingKm: 15 }

const minus = (t: string) => t.replace('-', '−')
const km = (m: number) => minus(`${(Math.round(m) / 1000).toFixed(3)} km`) // whole metres first: 10720.5 m -> 10.721 km
const kelvin = (k: number) => `${k.toFixed(0)} K`
const deg = (d: number) => minus(`${d.toFixed(1)}°`)
const pct = (v: number) => `${v.toFixed(1)} %`

// Labels under the colour bar: at the ends the lowest and highest value of the colour scale, with the dataset's
// uncertainty when a source gives one (`end_uncertainty`, written by scripts/layers.py); in the middle the median
// (distribution scale, 5 breakpoints) or the midpoint (linear scale). An end that is not the real extreme of the data
// (an image still made with the older scale clipped at the 2nd / 98th percentile) is marked ≤ or ≥.
type Meta = { breaks: number[]; data_min?: number; data_max?: number; end_uncertainty?: number }
export function scaleLabels(m: Meta, f: (v: number) => string, u?: (v: number) => string): string[] {
  const b = m.breaks, lo = b[0], hi = b[b.length - 1]
  const loExact = m.data_min != null && lo <= m.data_min + 1e-9
  const hiExact = m.data_max != null && hi >= m.data_max - 1e-9
  const pm = m.end_uncertainty != null && u ? ` ± ${u(m.end_uncertainty)}` : ''
  return [loExact ? f(lo) + pm : `≤ ${f(lo)}`, f(b.length === 5 ? b[2] : (lo + hi) / 2), hiExact ? f(hi) + pm : `≥ ${f(hi)}`]
}
// How the colours are spread, for the (i) text: depends on whether the layer's images use the exact ends yet.
const distribution = (m: Meta) => (m.data_min != null && m.breaks[0] <= m.data_min + 1e-9
  ? ' Colours: the ends of the bar are the lowest and the highest value drawn (whole Moon and polar cap together); in between, the '
    + 'palette is spread over the 25th, 50th and 75th percentile of the whole-Moon map (area-weighted), so each quarter of the palette '
    + 'covers a quarter of the surface and small differences stay visible.'
  : ' Colours follow the distribution of the values: the palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile of the '
    + 'whole-Moon map (area-weighted); lower and higher values are drawn in the end colours, marked ≤ and ≥ on the bar.')
const visibility = (body: 'Sun' | 'Earth', d: typeof data.sun_visibility, nasa: string) =>
  `Share of time in which any part of the ${body}'s disc is above the horizon, in the long run. Whole Moon: computed by this project `
  + `on a ${d.global_step_deg}° grid over one 18.6-year lunar cycle (2020 to 2038, a position every 6 hours from the JPL DE440 ephemeris), `
  + `with a smooth-sphere horizon seen from 2 m: hills are ignored, which is acceptable away from the poles `
  + `(values from ${d.global_min.toFixed(0)} % to ${d.global_max.toFixed(0)} %, mean ${d.global_mean.toFixed(0)} %). `
  + `South of 85° S: NASA's map with the real terrain, hourly steps over 18.6 years on ${d.cap_pixel_m} m pixels (${nasa}, Mazarico et al. 2011, `
  + `NASA PGDA product 69). Both use the same definition. It is an average, not the value on your landing date. Linear colour scale from the lowest to the highest value drawn (${d.data_min.toFixed(1)} to ${d.data_max.toFixed(1)} %).`

export const LAYERS: Layer[] = [
  {
    id: 'slope', doc: 'layer-slope', label: 'Slope', kind: 'image', global: data.slope.global, cap: data.slope.cap, strip: data.slope.strip,
    legend: scaleLabels(data.slope, deg, deg),
    how: `Surface slope. Whole Moon: computed by this project from the LOLA altitude map LDEM_128 by central differences over one `
      + `${data.slope.global_pixel_m} m pixel (east-west over as many columns as needed for at least that distance on the ground, also near the poles), slope = atan(√((∂z/∂x)² + (∂z/∂y)²)), then averaged to the 3.8 km image pixel. `
      + `South of 80° S: the official LOLA slope map over an ${data.slope.cap_pixel_m} m baseline (LDSM_80S_80MPP_ADJ, Barker et al., NASA PGDA product 90). `
      + `A slope measured over a longer baseline is smoother, so the whole-Moon values are lower than the 80 m ones for the same ground. `
      + `It cannot show boulders or metre-scale slopes. ± 0.2° at the ends of the bar: the ± 1 m height accuracy of LOLA (Smith et al. 2017) `
      + `propagated through the central difference over 237 m. 15 pixels of the 80 m map with small negative slopes (to −0.42°) are left out.` + distribution(data.slope),
  },
  {
    id: 'altitude', doc: 'layer-altitude', label: 'Altitude', kind: 'image', global: data.altitude.global, cap: data.altitude.cap, strip: data.altitude.strip,
    legend: scaleLabels(data.altitude, km, (m) => `${m} m`),
    how: `Altitude of the surface: height above the 1737.4 km reference sphere, measured by the LOLA laser altimeter. Whole Moon: LDEM_128, `
      + `${data.altitude.global_pixel_m} m pixels (PDS LRO-L-LOLA-4-GDR-V1.0). South of 80° S: LDEM_80S_80MPP_ADJ, `
      + `${data.altitude.cap_pixel_m} m pixels (Barker et al., NASA PGDA product 90). Read from the maps, not computed. `
      + `Lowest ${km(data.altitude.data_min)}, highest ${km(data.altitude.data_max)} (± 1 m: vertical accuracy of the gridded LOLA maps, Smith et al. 2017).` + distribution(data.altitude),
  },
  {
    id: 'sun_visibility', doc: 'layer-visibility', label: 'Sun visibility, long term', kind: 'image', global: data.sun_visibility.global,
    cap: data.sun_visibility.cap, strip: data.sun_visibility.strip, legend: scaleLabels(data.sun_visibility, pct),
    how: visibility('Sun', data.sun_visibility, 'AVGVISIB_85S_060M_201608'),
  },
  {
    id: 'earth_visibility', doc: 'layer-visibility', label: 'Earth visibility, long term', kind: 'image', global: data.earth_visibility.global,
    cap: data.earth_visibility.cap, strip: data.earth_visibility.strip, legend: scaleLabels(data.earth_visibility, pct),
    how: visibility('Earth', data.earth_visibility, 'AVGVISIB_85S_060M_201608_EARTH'),
  },
  {
    id: 'psr', doc: 'layer-psr', label: 'Permanently shadowed regions', kind: 'image', global: data.psr.global, cap: data.psr.cap, strip: data.psr.strip, legend: null,
    how: `Places the Sun never reaches: where the ice science is, and where a solar lander must not sit. They exist only near the poles. `
      + `Both poles, poleward of 65°: NASA's ${data.psr.global_pixel_m} m maps derived from LOLA topography (LPSR_65N_240M and LPSR_65S_240M, Mazarico et al. 2011). `
      + `South of 80° S, finer: ${data.psr.count.toLocaleString('en-GB')} outlines larger than 1 km², ${data.psr.area_km2.toLocaleString('en-GB')} km² in total `
      + `(LPSR_80S_20MPP_ADJ, Barker et al., NASA PGDA product 90). Read from the maps, not computed.`,
  },
  {
    id: 'temperature_max', doc: 'layer-temperature', label: 'Surface temperature, maximum', kind: 'image', global: data.temperature_max.global,
    cap: data.temperature_max.cap, strip: data.temperature_max.strip, legend: scaleLabels(data.temperature_max, kelvin),
    how: `The highest surface temperature. Whole Moon: measured by the Diviner radiometer on LRO, bolometric brightness temperature in bins of `
      + `${data.temperature_max.global_bin_deg}° and a quarter of an hour of local time, all nadir data from July 2009 to April 2015 `
      + `(Global Cumulative Product, PDS LRO-L-DLRE-5-GCP-V1.0, Williams et al. 2017, Icarus 283). Shown: the highest value over the local times of each bin `
      + `(${kelvin(data.temperature_max.data_min)} to ${kelvin(data.temperature_max.data_max)}). South of 80° S, finer: the yearly maximum calculated by the `
      + `Diviner team's thermal model on ${data.temperature_max.cap_triangles.toLocaleString('en-GB')} terrain triangles (Polar Resource Product, `
      + `LRO-L-DLRE-5-PRP-V2.0, Paige et al.). The two are different products, so a step can show at 80° S. Not the temperature on your landing date.` + distribution(data.temperature_max),
  },
  {
    id: 'temperature_avg', doc: 'layer-temperature', label: 'Surface temperature, average', kind: 'image', global: data.temperature_avg.global,
    cap: data.temperature_avg.cap, strip: data.temperature_avg.strip, legend: scaleLabels(data.temperature_avg, kelvin),
    how: `The average temperature over a lunar day. Whole Moon: the mean over the day of the Diviner bolometric brightness temperature `
      + `(Global Cumulative Product, PDS LRO-L-DLRE-5-GCP-V1.0, Williams et al. 2017). Hours of local time that were not observed are filled by linear `
      + `interpolation when the gap is at most ${data.temperature_avg.max_gap_h} h; places with a longer gap are left blank, not guessed `
      + `(${(data.temperature_avg.covered_frac * 100).toFixed(0)} % of the Moon is covered). `
      + `South of 80° S, finer: the yearly average 2 cm below the surface from the Diviner team's thermal model (Polar Resource Product, `
      + `LRO-L-DLRE-5-PRP-V2.0, Paige et al.). Different products, so a step can show at 80° S. Not the temperature on your landing date.` + distribution(data.temperature_avg),
  },
  {
    id: 'rock_abundance', doc: 'layer-rock-abundance', label: 'Rock abundance', kind: 'image', global: data.rock_abundance.global,
    legend: scaleLabels(data.rock_abundance, (v) => `${(v * 100).toFixed(2)} %`),
    how: `Share of the ground covered by rocks larger than about 1 m, estimated from Diviner night-time temperatures (rocks stay warm after `
      + `sunset, fine regolith cools fast): Diviner level 3 map dgdr_ra_avg_cyl_128 (Bandfield et al. 2011, PDS Diviner derived bundle), `
      + `128 px/deg averaged to ${data.rock_abundance.pixel_km.toFixed(2)} km pixels. Mapped from 80° S to 80° N only: nothing is drawn poleward of that `
      + `(no Diviner rock abundance exists there). Read from the map, not computed.` + distribution(data.rock_abundance),
  },
  {
    id: 'h_parameter', doc: 'layer-h-parameter', label: 'Thermal inertia (H-parameter)', kind: 'image', global: data.h_parameter.global,
    legend: scaleLabels(data.h_parameter, (v) => `${(v * 100).toFixed(1)} cm`, (v) => `${(v * 100).toFixed(0)} cm`),
    how: `How quickly the regolith gets denser with depth: ρ(z) = ρd − (ρd − ρs)·exp(−z/H). Small H (dark colours) = dense, conductive regolith near `
      + `the surface = higher thermal inertia; large H (bright) = fluffy regolith = lower thermal inertia. Fitted to Diviner channel 7 night-time `
      + `temperatures by Hayne et al. 2017 (JGR Planets 122), map hpar_global_128ppd (PDS Geosciences), averaged to ${data.h_parameter.pixel_km.toFixed(2)} km `
      + `pixels. Mapped from 70° S to 70° N only: nothing is drawn poleward of that. Global median ${(data.h_parameter.median * 100).toFixed(1)} cm.` + distribution(data.h_parameter),
  },
  {
    id: 'daynight', doc: 'layer-daynight', label: 'Day and night at landing time', kind: 'daynight', legend: null,
    how: `The shaded half is where the Sun is below the horizon at the landing time. Drawn from the point of the Moon that has the Sun `
      + `overhead (from the analysis: JPL DE440 ephemeris), on a smooth sphere: sin(h) = sin φ sin φs + cos φ cos φs cos(λ − λs), `
      + `night where h is negative. Terrain is ignored here, so near the poles a place on the lit side can still be in the shadow of a ridge. `
      + `On the globe the lighting itself shows it.`,
  },
  {
    id: 'score', doc: 'layer-score', label: 'Score for your settings', kind: 'score', legend: null,
    how: `Our own result as a map, for your landing time, stay and weights (weighted mean of sunlight, longest night, Earth link, longest link gap `
      + `and slope, 0 to 1). Whole Moon: the analysis server evaluates the centre of every ${SCORE_GRID_DEG}° cell with a smooth-sphere horizon and the LOLA slope `
      + `(about 5 s). Around the south pole, out to 80° S: a point every ${SCORE_MAP.spacingKm} km with the real terrain skyline (about 15 s the first time). `
      + `Colours are stretched between the lowest and the highest score found, printed next to the bar. Click a place for its full evaluation with the terrain.`,
  },
]

export const layerById = (id: LayerId | null): Layer | null => LAYERS.find((l) => l.id === id) ?? null
// Named in the picker but not available: the reason is shown instead.
export const UNAVAILABLE = ['Artemis candidate regions (NASA has published names, no coordinates)']
