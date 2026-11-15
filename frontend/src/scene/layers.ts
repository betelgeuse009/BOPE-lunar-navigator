import data from '../data/layers.json'

// Map layers. Image layers are NASA maps redrawn as transparent images by scripts/layers.py; the numbers in the
// wording (ranges, counts) come from that script's output, src/data/layers.json. Two layers are drawn live instead:
// the day/night line (from the Sun's position) and the score map (asked from the analysis server).
// `how` is what the (i) next to the layer name shows: where the values come from or how they are calculated.
export type LayerId = 'elevation' | 'slope' | 'sun_visibility' | 'earth_visibility' | 'psr'
  | 'temperature_max' | 'temperature_avg' | 'daynight' | 'score'
export type Layer = {
  id: LayerId; label: string; kind: 'image' | 'daynight' | 'score'
  global?: string   // whole-Moon image, simple cylindrical
  cap?: string      // south polar cap image for the globe (pole-centred)
  strip?: string    // the same cap as a flat strip for the 2D map
  legend: [string, string] | null
  how: string
}

export const LAYER_CAP_DEG: number = data.cap_deg
export const LAYER_STRIP_DEG: number = data.strip_deg
// The score map asks the server for a disc around the south pole: out to 80 S, one point every 15 km.
export const SCORE_MAP = { radiusKm: 300, spacingKm: 15 }
const km = (m: number) => `${(m / 1000).toFixed(1)} km`
const kelvin = (k: number) => `${k.toFixed(0)} K (${(k - 273.15).toFixed(0)} °C)`
const temperatureSource = `Diviner Polar Resource Product (NASA PDS, LRO-L-DLRE-5-PRP-V2.0, Paige et al., UCLA): `
  + `${data.temperature_max.triangles.toLocaleString('en-GB')} terrain triangles, each with a temperature calculated by the Diviner `
  + `team's thermal model from the instrument's measurements. Shown south of 80° S. A yearly figure, not the temperature on your landing date.`

export const LAYERS: Layer[] = [
  {
    id: 'slope', label: 'Slope', kind: 'image', cap: data.slope.cap, strip: data.slope.strip,
    legend: [`${data.slope.range[0]}°`, `${data.slope.range[1]}° and more`],
    how: `Surface slope over an ${data.slope.cap_pixel_m} m baseline: the official LOLA slope map LDSM_80S_80MPP_ADJ `
      + `(Barker et al., NASA PGDA product 90), averaged to about 300 m for display. South of 80° S only. `
      + `Read from the map, not computed. It cannot show boulders or metre-scale slopes.`,
  },
  {
    id: 'elevation', label: 'Elevation', kind: 'image', global: data.elevation.global, cap: data.elevation.cap, strip: data.elevation.strip,
    legend: [km(data.elevation.range[0]), km(data.elevation.range[1])],
    how: `Height above the 1737.4 km reference sphere, measured by the LOLA laser altimeter. Whole Moon: LDEM_128, `
      + `${data.elevation.global_pixel_m} m pixels (PDS LRO-L-LOLA-4-GDR-V1.0). South of 80° S: LDEM_80S_80MPP_ADJ, `
      + `${data.elevation.cap_pixel_m} m pixels (Barker et al., NASA PGDA product 90). Read from the maps, not computed. `
      + `Colours run from ${km(data.elevation.range[0])} to ${km(data.elevation.range[1])}, the 1st and 99th percentile of the global map `
      + `(lowest ${km(data.elevation.data_min)}, highest ${km(data.elevation.data_max)}).`,
  },
  {
    id: 'sun_visibility', label: 'Sun visibility, long term', kind: 'image', cap: data.sun_visibility.cap, strip: data.sun_visibility.strip,
    legend: ['0 %', '100 %'],
    how: `NASA's long-term average: the share of time in which any part of the Sun's disc is visible, from hourly steps over `
      + `18.6 years on ${data.sun_visibility.cap_pixel_m} m pixels (AVGVISIB_85S_060M_201608, Mazarico et al. 2011, NASA PGDA product 69). `
      + `South of 85° S only; highest value ${data.sun_visibility.data_max.toFixed(0)} %. It is an average, not the sunlight on your landing date.`,
  },
  {
    id: 'earth_visibility', label: 'Earth visibility, long term', kind: 'image', cap: data.earth_visibility.cap, strip: data.earth_visibility.strip,
    legend: ['0 %', '100 %'],
    how: `NASA's long-term average: the share of time in which any part of the Earth's disc is visible, from hourly steps over `
      + `18.6 years on ${data.earth_visibility.cap_pixel_m} m pixels (AVGVISIB_85S_060M_201608_EARTH, Mazarico et al. 2011, NASA PGDA product 69). `
      + `South of 85° S only. It is an average, not the link time on your landing date.`,
  },
  {
    id: 'psr', label: 'Permanently shadowed regions', kind: 'image', cap: data.psr.cap, strip: data.psr.strip, legend: null,
    how: `Permanently shadowed regions larger than 1 km²: ${data.psr.count.toLocaleString('en-GB')} outlines covering `
      + `${data.psr.area_km2.toLocaleString('en-GB')} km² in total, derived from LOLA topography (LPSR_80S_20MPP_ADJ, Barker et al., `
      + `NASA PGDA product 90). South of 80° S. The Sun never reaches these places: where the ice science is, and where a solar lander must not sit.`,
  },
  {
    id: 'temperature_max', label: 'Surface temperature, yearly maximum', kind: 'image', cap: data.temperature_max.cap, strip: data.temperature_max.strip,
    legend: [kelvin(data.temperature_max.range[0]), kelvin(data.temperature_max.range[1])],
    how: `The highest surface temperature reached in a year. ${temperatureSource} Coldest place ${kelvin(data.temperature_max.data_min)}, `
      + `warmest ${kelvin(data.temperature_max.data_max)}.`,
  },
  {
    id: 'temperature_avg', label: 'Temperature, yearly average', kind: 'image', cap: data.temperature_avg.cap, strip: data.temperature_avg.strip,
    legend: [kelvin(data.temperature_avg.range[0]), kelvin(data.temperature_avg.range[1])],
    how: `The yearly average temperature 2 cm below the surface. ${temperatureSource} Lowest ${kelvin(data.temperature_avg.data_min)}, `
      + `highest ${kelvin(data.temperature_avg.data_max)}.`,
  },
  {
    id: 'daynight', label: 'Day and night at landing time', kind: 'daynight', legend: null,
    how: `The shaded half is where the Sun is below the horizon at the landing time. Drawn from the point of the Moon that has the Sun `
      + `overhead (from the analysis: JPL DE440 ephemeris), on a smooth sphere: sin(elevation) = sin φ sin φs + cos φ cos φs cos(λ − λs), `
      + `night where it is negative. Terrain is ignored here, so near the poles a place on the lit side can still be in the shadow of a ridge.`,
  },
  {
    id: 'score', label: 'Score for your settings', kind: 'score', legend: ['0', '1'],
    how: `Our own result as a map: the analysis server evaluates a point every ${SCORE_MAP.spacingKm} km out to ${SCORE_MAP.radiusKm} km from the south pole `
      + `(to about 80° S) for your landing time, stay and weights, with the real terrain skyline, and returns the 0 to 1 score of each `
      + `(weighted mean of sunlight, longest night, Earth link, longest link gap and slope). Needs the live server; the first map of a new date takes about 15 s.`,
  },
]

export const layerById = (id: LayerId | null): Layer | null => LAYERS.find((l) => l.id === id) ?? null
// Named in the picker but not available: the reason is shown instead.
export const UNAVAILABLE = ['Artemis candidate regions (NASA has published names, no coordinates)']
