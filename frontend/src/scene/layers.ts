import data from '../data/layers.json'

// Map layers: LOLA maps redrawn as transparent images by scripts/layers.py. The numbers in the wording (ranges, counts)
// come from that script's output, src/data/layers.json. `how` is what the (i) next to the layer name shows.
export type LayerId = 'elevation' | 'slope' | 'sun_visibility' | 'earth_visibility' | 'psr'
export type Layer = { id: LayerId; label: string; global?: string; cap: string; legend: [string, string] | null; how: string }

export const LAYER_CAP_DEG: number = data.cap_deg
const km = (m: number) => `${(m / 1000).toFixed(1)} km`

export const LAYERS: Layer[] = [
  {
    id: 'elevation', label: 'Elevation', global: data.elevation.global, cap: data.elevation.cap,
    legend: [km(data.elevation.range[0]), km(data.elevation.range[1])],
    how: `Height above the 1737.4 km reference sphere, measured by the LOLA laser altimeter. Whole Moon: LDEM_128, `
      + `${data.elevation.global_pixel_m} m pixels (PDS LRO-L-LOLA-4-GDR-V1.0). South of 80° S: LDEM_80S_80MPP_ADJ, `
      + `${data.elevation.cap_pixel_m} m pixels (Barker et al., NASA PGDA product 90). Read from the maps, not computed. `
      + `Colours run from ${km(data.elevation.range[0])} to ${km(data.elevation.range[1])}, the 1st and 99th percentile of the global map `
      + `(lowest ${km(data.elevation.data_min)}, highest ${km(data.elevation.data_max)}).`,
  },
  {
    id: 'slope', label: 'Slope', cap: data.slope.cap, legend: [`${data.slope.range[0]}°`, `${data.slope.range[1]}° and more`],
    how: `Surface slope over an ${data.slope.cap_pixel_m} m baseline: the official LOLA slope map LDSM_80S_80MPP_ADJ `
      + `(Barker et al., NASA PGDA product 90), averaged to about 300 m for display. South of 80° S only. `
      + `It cannot show boulders or metre-scale slopes.`,
  },
  {
    id: 'sun_visibility', label: 'Sun visibility, long term', cap: data.sun_visibility.cap, legend: ['0 %', '100 %'],
    how: `NASA's long-term average: the share of time in which any part of the Sun's disc is visible, from hourly steps over `
      + `18.6 years on ${data.sun_visibility.cap_pixel_m} m pixels (AVGVISIB_85S_060M_201608, Mazarico et al. 2011, NASA PGDA product 69). `
      + `South of 85° S only; highest value ${data.sun_visibility.data_max.toFixed(0)} %. It is an average, not the sunlight on your landing date.`,
  },
  {
    id: 'earth_visibility', label: 'Earth visibility, long term', cap: data.earth_visibility.cap, legend: ['0 %', '100 %'],
    how: `NASA's long-term average: the share of time in which any part of the Earth's disc is visible, from hourly steps over `
      + `18.6 years on ${data.earth_visibility.cap_pixel_m} m pixels (AVGVISIB_85S_060M_201608_EARTH, Mazarico et al. 2011, NASA PGDA product 69). `
      + `South of 85° S only. It is an average, not the link time on your landing date.`,
  },
  {
    id: 'psr', label: 'Permanent shadow', cap: data.psr.cap, legend: null,
    how: `Permanently shadowed regions larger than 1 km²: ${data.psr.count.toLocaleString('en-GB')} outlines covering `
      + `${data.psr.area_km2.toLocaleString('en-GB')} km² in total, derived from LOLA topography (LPSR_80S_20MPP_ADJ, Barker et al., `
      + `NASA PGDA product 90). South of 80° S. The Sun never reaches these places.`,
  },
]
