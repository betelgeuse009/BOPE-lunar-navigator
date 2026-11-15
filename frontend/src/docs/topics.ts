// Documentation behind every "?" in the two side panes (rule: ui/Help.tsx).
// Display text only. Every statement comes from the analysis team's documents (docs/PARAMETERS.md, contracts/API.md,
// data/MAPS.md, data/SITES.md, docs/validation/) or from the cited source; nothing here is computed or measured by the
// front end. A value without a published source says so.

// Text may hold inline maths between $...$ (TeX) and citations [n] that point into the topic's reference list; eq is display TeX.
export type Section = { h: string; p?: string[]; eq?: string; table?: { head: string[]; rows: string[][] } }
export type Category = 'Mission setup' | 'Results' | 'Map layers' | 'Methods'
type TopicDef = { title: string; category: Category; summary: string; sections: Section[]; refs: RefId[]; seeAlso?: string[] }

export const REFS = {
  parameters: { text: 'BOPE analysis team, "Site evaluation parameters", docs/PARAMETERS.md in the project repository (v0 proposal).' },
  api: { text: 'BOPE analysis team, "Analysis API", contracts/API.md in the project repository.' },
  maps: { text: 'BOPE analysis team, "Lunar maps (LOLA / LROC) used by the analysis", data/MAPS.md in the project repository.' },
  sites: { text: 'BOPE analysis team, "Known landing sites", data/SITES.md in the project repository.' },
  valHorizons: { text: 'BOPE analysis team, "Validation: our API vs JPL Horizons", docs/validation/horizons.md, generated 2026-11-14.' },
  valAvgvisib: { text: 'BOPE analysis team, "Validation: terrain horizon vs LOLA long-term visibility maps", docs/validation/avgvisib.md, generated 2026-11-14.' },
  nasaReq: {
    text: 'NASA, "Key Artemis III Landing Requirements", Artemis overview 2025, NTRS 20250009323.',
    url: 'https://ntrs.nasa.gov/api/citations/20250009323/downloads/ArtemisOverview2025IntSPAPPSChallenge.pdf',
  },
  nasa2022: {
    text: 'NASA, "NASA Identifies Candidate Regions for Landing Next Americans on Moon", news release, 19 Aug 2022.',
    url: 'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/',
  },
  kopp2011: { text: 'Kopp, G. and Lean, J. L. (2011), "A new, lower value of total solar irradiance", Geophys. Res. Lett. 38, L01706.' },
  pgda90: { text: 'Barker et al., LOLA south-pole altitude (elevation model), slope and height-error maps, NASA PGDA product 90.', url: 'https://pgda.gsfc.nasa.gov/products/90' },
  pgda81: { text: 'LOLA 5 m south-pole altitude map, NASA PGDA product 81.', url: 'https://pgda.gsfc.nasa.gov/products/81' },
  pgda69: {
    text: 'Mazarico, E. et al. (2011), "Illumination conditions of the lunar polar regions using LOLA topography", Icarus 211, 1066-1081; maps: NASA PGDA product 69.',
    url: 'https://pgda.gsfc.nasa.gov/products/69',
  },
  lolaGdr: { text: 'LOLA global gridded data record LDEM_128, PDS data set LRO-L-LOLA-4-GDR-V1.0.' },
  de440: { text: 'Park, R. S. et al. (2021), "The JPL Planetary and Lunar Ephemerides DE440 and DE441", Astron. J. 161, 105. Kernel used: de440s.bsp.' },
  spice: { text: 'Acton, C. H. (1996), "Ancillary data services of NASA\'s Navigation and Ancillary Information Facility", Planet. Space Sci. 44, 65-70 (SPICE toolkit).' },
  bandfield2011: { text: 'Bandfield, J. L. et al. (2011), "Lunar surface rock abundance and regolith fines temperatures derived from LRO Diviner Radiometer data", J. Geophys. Res. 116, E00H02.' },
  divinerGdr: { text: 'Diviner Lunar Radiometer, gridded data record level 3, rock abundance dgdr_ra_avg_cyl_128, PDS LRO Diviner derived bundle.', url: 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gdr_l3/' },
  hayne2017: { text: 'Hayne, P. O. et al. (2017), "Global regolith thermophysical properties of the Moon from the Diviner Lunar Radiometer Experiment", J. Geophys. Res. Planets 122, 2371-2400; map hpar_global_128ppd (PDS Geosciences).', url: 'https://pds-geosciences.wustl.edu/lunar/urn-nasa-pds-chang_e_microwave_processed/miscellaneous/' },
  williams2017: { text: 'Williams, J.-P. et al. (2017), "The global surface temperatures of the Moon as measured by the Diviner Lunar Radiometer Experiment", Icarus 283, 300-325; Global Cumulative Product LRO-L-DLRE-5-GCP-V1.0.', url: 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/' },
  divinerPrp: { text: 'Paige, D. A. et al., Diviner Polar Resource Product, PDS LRO-L-DLRE-5-PRP-V2.0.', url: 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/' },
  apollo1968: {
    text: 'Uri, J. (2018), "50 Years Ago: Lunar Landing Sites Selected", NASA Johnson Space Center, 8 Feb 2018: criteria of the Apollo Site Selection Board (1968).',
    url: 'https://www.nasa.gov/feature/50-years-ago-lunar-landing-sites-selected',
  },
  novaC: {
    text: 'Getchius, J. et al. (2022), "Hazard Detection And Avoidance For The Nova-C Lander", arXiv:2204.00660 (Intuitive Machines lander design criteria).',
    url: 'https://arxiv.org/abs/2204.00660',
  },
  lolaIllum: {
    text: 'LOLA team, polar illumination products (LPSR permanently shadowed region maps and AVGVISIB average visibility maps, 2016), README_ILLUMINATION_2016 and PDS labels; method in Mazarico et al. (2011).',
    url: 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/',
  },
  layersCode: { text: 'BOPE team, map layer processing: frontend/scripts/layers.py (images and colour scales), frontend/scripts/nomenclature.py (feature names), analysis/global_visibility.py and analysis/regolith.py, in the project repository.' },
  svsMoon: { text: 'NASA Scientific Visualization Studio, "CGI Moon Kit" (LROC WAC colour mosaic and LOLA altitude for 3D rendering).', url: 'https://svs.gsfc.nasa.gov/4720' },
  contract: { text: 'BOPE team, "Data contract", contracts/README.md and contracts/schemas/ in the project repository.' },
  wikipedia: { text: 'Wikipedia, the free encyclopedia: opening paragraphs of each mission article, licence CC BY-SA 4.0; images from Wikimedia Commons under the licence shown on each card.', url: 'https://en.wikipedia.org' },
  nssdca: { text: 'NASA NSSDCA, lunar landing and impact site coordinates.', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html' },
  lroc: { text: 'LROC (Lunar Reconnaissance Orbiter Camera) image measurements of landing sites.', url: 'https://lroc.im-ldi.com' },
  gazetteer: {
    text: 'IAU Working Group for Planetary System Nomenclature and USGS Astrogeology Science Center, Gazetteer of Planetary Nomenclature: Moon, centre points (MOON_nomenclature_center_pts), downloaded 2026-11-15.',
    url: 'https://planetarynames.wr.usgs.gov/',
  },
  meeus1998: { text: 'Meeus, J. (1998), Astronomical Algorithms, 2nd ed., Willmann-Bell, Richmond (mean lengths of the synodic, anomalistic and draconic months).' },
} satisfies Record<string, { text: string; url?: string }>
export type RefId = keyof typeof REFS

const VISIBLE = 'The visible fraction of a disc is the part of it above the local skyline (circular-segment formula). '
const DISC_LIMITS = [
  'The skyline is taken as flat across the width of the disc (0.5° for the Sun, 1.9° for the Earth).',
  'Durations have the resolution of the internal time step: 60 s for a single place, 600 s for the date strips and the nearby search.',
]

const DEFS = {
  // ---------------- Mission setup ----------------
  'landing-time': {
    title: 'Landing date and time', category: 'Mission setup',
    summary: 'The instant of touchdown, in UTC. Every result is computed over the window that starts here and lasts for the surface stay.',
    sections: [
      { h: 'Description', p: [
        'All parameters are computed over the mission window $[t_0,\\ t_0 + T]$, with $t_0$ the landing time and $T$ the surface stay. On the Moon the Sun and the Earth move slowly along the horizon (a lunar day lasts about 29.5 Earth days), so the same place can be a good or a bad choice depending on the day and hour of landing.',
      ] },
      { h: 'Calendar', p: [
        'With the analysis server running, any landing day from 1850 to 2149 can be chosen in the calendar. This is the span of the ephemeris file in use (de440s.bsp, 1849 to 2150), less a margin for the date strip and the stay.',
        'A past date gives the sky of that day, for example of an Apollo landing, over the terrain as the LOLA maps record it today.',
      ] },
      { h: 'The two strips', p: [
        'Landing date: 30 days starting at the day chosen in the calendar, one cell per day. Once a place is chosen on the Moon, each cell shows its value for a mission landing on that day at the chosen time, for the quantity chosen under "Colour sites by". Before a place is chosen the strip has no colours.',
        'Landing time: one value every 10 minutes of the chosen day, for the chosen place (no colours before a place is chosen). Its colours are stretched between the worst and the best value of that day, which are printed under the strip, so small differences within a day stay visible.',
      ] },
      { h: 'Limitations', p: [
        'Without the analysis server only the precomputed files are available: they are computed for landings at 00:00 UTC with the default settings, and the time of day cannot be changed.',
        DISC_LIMITS[1],
      ] },
      { h: 'Landing criteria', p: ['Apollo chose the landing time so that the Sun was 7° to 20° behind the lander during the approach, which left about one launch day per month for each site [4]. Artemis III: approach lighting is beneficial, and at the south pole the peak lighting conditions are periodic and shift 2 to 3 weeks earlier each year [5].'] },
    ],
    refs: ['parameters', 'api', 'de440', 'apollo1968', 'nasaReq'], seeAlso: ['surface-stay', 'ephemeris', 'time-series'],
  },
  coordinates: {
    title: 'Place: coordinates', category: 'Mission setup',
    summary: 'Type the latitude and longitude of the place to evaluate, instead of clicking on the Moon. The boxes show the coordinates of the place chosen last.',
    sections: [
      { h: 'Convention', p: [
        'Selenographic coordinates in the Mean Earth / Polar Axis frame (MOON_ME), the frame of the LOLA maps and of every result of the analysis server [1][2]. Latitude: planetocentric, −90° (south pole) to +90° (north pole). Longitude: east-positive, −180° to +180°; a value from 180° to 360° is also accepted and turned into the same place west of 0° (for example 270° E = −90°).',
        'Decimal degrees only. South latitudes and west longitudes are negative. A comma is read as a decimal point.',
      ] },
      { h: 'What happens', p: [
        '"Go" chooses the place exactly as a click on the globe would: the analysis server evaluates it and the Results pane, the strips, the surface view and the nearby search follow. Choosing a place in any other way (click, known landing site) writes its coordinates back into the boxes, rounded to 0.0001° (about 3 m on the Moon).',
      ] },
      { h: 'Limitations', p: [
        'Needs the analysis server: offline only the precomputed known sites exist.',
        'A position typed here is a point; the landing accuracy of a real lander is handled by the uncertainty ring (see Uncertainty).',
      ] },
    ],
    refs: ['contract', 'api'], seeAlso: ['uncertainty', 'known-sites'],
  },
  'mission-type': {
    title: 'Mission type', category: 'Mission setup',
    summary: 'A preset that switches on the minimum requirements of a robotic or a crewed landing. Every value can be changed afterwards.',
    sections: [
      { h: 'Description', p: ['Choosing a mission type fills in the minimum requirements below it. It does not change how anything is computed: it only sets limits, and for a crewed landing the surface stay.'] },
      { h: 'Preset values', table: {
        head: ['Mission type', 'Requirement', 'Value', 'Source'],
        rows: [
          ['No limits', 'none', '', 'Score only.'],
          ['Robotic lander', 'Max landing slope, max longest night, min Earth in view', 'to be entered', "No single published value applies to every lander, so none is preset. Enter your lander's numbers."],
          ['Crewed', 'Max landing slope', '10°', 'NASA: "Surface slope for landing (100m): <10 deg" [1].'],
          ['Crewed', 'Max longest night', '0 h', 'NASA: "require the surface to be lit for the duration of the surface stay" [1].'],
          ['Crewed', 'Min Earth in view', '25 %', 'NASA: direct-with-Earth link, areas with "Earth visibility < 25%" excluded [1].'],
          ['Crewed', 'Surface stay', '6.5 days', 'NASA: "a 6.5-day period, the planned duration of the Artemis III surface mission" [2].'],
        ],
      } },
      { h: 'Limitations', p: [
        'The crewed values were written by NASA for Artemis III, the first crewed south-pole landing. That flight is now an Earth-orbit test in 2027 and the landing is planned for Artemis IV.',
        'NASA measures the landing slope over 100 m; our slope south of 80° S is measured over 80 m.',
        'NASA applies the 25 % Earth-visibility rule to long-term visibility; here it is applied to the mission window.',
        'Also required by NASA but not checked here: landing within 6° of the south pole and within 100 m of the target; EVA slopes under 20° over 2 km.',
        'These preset values are under review by the analysis team.',
      ] },
    ],
    refs: ['nasaReq', 'nasa2022', 'parameters'], seeAlso: ['requirements', 'surface-stay', 'slope'],
  },
  requirements: {
    title: 'Minimum requirements', category: 'Mission setup',
    summary: 'Hard limits. A place that breaks any limit you switched on fails, whatever its score.',
    sections: [
      { h: 'Description', p: ['A place is feasible when it meets every limit that is switched on. Limits and score are independent: the score ranks places, the limits rule places out.'] },
      { h: 'Rules', table: {
        head: ['Limit', 'A place passes when'],
        rows: [
          ['Max landing slope', '$\\theta \\le \\theta_{\\max}$'],
          ['Max longest night', '$L_{\\text{dark}} \\le L_{\\text{dark,max}}$'],
          ['Min sunlight', '$f_\\odot \\ge f_{\\odot,\\min}$'],
          ['Min Earth in view', '$f_\\oplus \\ge f_{\\oplus,\\min}$'],
          ['Max longest blackout', '$L_{\\text{blackout}} \\le L_{\\text{blackout,max}}$'],
        ],
      } },
      { h: 'Defaults', p: ['No limit is set by default. The limits depend on the lander (battery, slope tolerance, link needs), so they are yours to choose, or come from the mission type.'] },
      { h: 'Limitations', p: [
        'A limit that needs data the server does not have is reported as "not checked" instead of passed or failed. Example: the slope limit when the LOLA maps are missing.',
        'A limit switched on without a value is not applied.',
      ] },
      { h: 'Landing criteria', p: ['Published values you can type in: landing slope below 10° over 100 m (Artemis III) or below 2° for the landing area (Apollo); longest night 0 h (Artemis III: lit for the whole stay); Earth in view at least 25 % (Artemis III excludes areas with Earth visibility below 25 % on its long-term maps) [3] [4]. The full list with baselines is on the page "Landing criteria".'] },
    ],
    refs: ['parameters', 'api', 'nasaReq', 'apollo1968'], seeAlso: ['mission-type', 'verdict', 'uncertainty'],
  },
  'surface-stay': {
    title: 'Surface stay', category: 'Mission setup',
    summary: 'How long the mission stays on the surface. It sets the length of the window every number is computed over.',
    sections: [
      { h: 'Description', p: ['The mission window is $[t_0,\\ t_0 + T]$, with $t_0$ the landing time and $T$ the surface stay. Shares (sunlight, Earth in view) are shares of this window; the longest night and the longest blackout are searched inside it.'] },
      { h: 'Values', p: ['Default: 14 days (336 h). The crewed preset sets 6.5 days, the planned Artemis III surface stay [1].'] },
      { h: 'Effect on the score', p: ['The sub-scores of the longest night and the longest blackout are $1 - L / T$, so the same night $L$ weighs less in a longer stay $T$.'] },
    ],
    refs: ['nasa2022', 'parameters'], seeAlso: ['landing-time', 'score'],
  },
  'mast-height': {
    title: 'Mast height', category: 'Mission setup',
    summary: 'Height of the solar array and antenna above the ground. A taller mast sees over nearby terrain, so the Sun and the Earth stay in view longer.',
    sections: [
      { h: 'Description', p: ['The observer is placed this high above the surface at the chosen point, and the skyline is computed from there. One height is used for both the solar array and the antenna.'] },
      { h: 'Values', p: ['Default: 2 m.'] },
      { h: 'Without terrain', p: ['When the LOLA maps are not available the horizon is a smooth sphere of radius $R = 1737.4\\ \\text{km}$, and a mast of height $h$ only lowers it by the dip angle $\\delta$ ($0.087^\\circ$ at $h = 2\\ \\text{m}$):'], eq: '\\delta = \\arccos\\!\\left( \\frac{R}{R + h} \\right)' },
    ],
    refs: ['parameters'], seeAlso: ['terrain-horizon', 'sunlight'],
  },
  'score-weights': {
    title: 'Score weights', category: 'Mission setup',
    summary: 'How much each of the five factors counts in the score. A weight of 0 leaves that factor out.',
    sections: [
      { h: 'Description', p: ['The score is the weighted average of the sub-scores. Raising a weight makes that factor count more; setting it to 0 removes it, for example the two Earth factors when a relay satellite carries the link.', 'Here $s_i \\in [0, 1]$ is the sub-score of factor $i$ and $w_i \\ge 0$ its weight.'], eq: 'S = \\frac{\\sum_i w_i\\, s_i}{\\sum_i w_i}' },
      { h: 'Values', p: ['Default: 1 for every factor. The defaults are a first proposal of the analysis team, not values taken from the literature.'] },
    ],
    refs: ['parameters'], seeAlso: ['score', 'sunlight', 'longest-night', 'earth-in-view', 'longest-blackout', 'slope'],
  },
  'nearby-search': {
    title: 'Search nearby', category: 'Mission setup',
    summary: 'Scores a grid of points inside a disc around the chosen place and marks the best one.',
    sections: [
      { h: 'Description', p: [
        'The analysis server evaluates points on a regular grid inside the radius, with the same settings and limits as the chosen place, and returns the score of each. The grid spacing is one tenth of the radius.',
        'The result names the best point: its distance and bearing from the chosen place, its score and the gain over the chosen place, together with the lowest and highest score found.',
      ] },
      { h: 'Colour scale', p: ['Absolute: colours run from score 0 to 1, comparable between areas. Relative: colours are stretched between the lowest and the highest score of this area, which shows the pattern inside it.'] },
      { h: 'Limitations', p: [
        'With terrain, scores change strongly over a few kilometres (ridges against crater walls). Without terrain the range inside a disc is tiny, about 0.01.',
        'The search uses a 600 s time step, coarser than the 60 s of the single-place evaluation.',
      ] },
    ],
    refs: ['api'], seeAlso: ['score', 'terrain-horizon'],
  },
  'known-sites': {
    title: 'Known landing sites', category: 'Mission setup',
    summary: '31 places where a spacecraft has landed, crashed or is planned to land, each with a cited coordinate.',
    sections: [
      { h: 'Description', p: ['Choosing a site is the same as clicking that point on the Moon: it becomes the chosen place and is evaluated with your settings. The dot shows the quantity chosen under "Colour sites by" for the chosen landing date.'] },
      { h: 'Contents', table: {
        head: ['Group', 'Sites', 'Coordinate source'],
        rows: [
          ['Apollo', 'Apollo 11, 12, 14, 15, 16, 17 (Lunar Module positions)', 'NSSDCA, measured on LRO images (Wagner et al. 2017, Icarus 283) [2]'],
          ['NASA robotic', 'Surveyor 1, 3, 5, 6, 7', 'NSSDCA [2]'],
          ['International', "Luna 9, 13, 16, 17, 20, 21, 23, 24; Chang'e 3, 4, 5, 6; Chandrayaan-3; SLIM", 'NSSDCA [2]; LROC image measurements [3]'],
          ['CLPS', 'IM-1, IM-2, Blue Ghost Mission 1; IM-3 (planned, Reiner Gamma)', 'LROC [3]; IM-3: centre of the named target region'],
          ['Commercial', 'HAKUTO-R Mission 1 and 2 (impact points)', 'LROC [3]'],
        ],
      } },
      { h: 'Mission cards', p: [
        'Pointing at a site, in the list or on the Moon, shows a card with one image and the opening of the mission\'s Wikipedia article [4]. Text and images are stored with the application, so the cards work offline. Each card names the author and the licence of its image; a mission without a freely licensed image has a card without one.',
      ] },
      { h: 'Conventions', p: [
        'Coordinates are planetocentric latitude and east longitude, Mean Earth / Polar Axis frame.',
        'Crewed or robotic is derived from the group: Apollo and Artemis are crewed, every other group is robotic.',
      ] },
      { h: 'Limitations', p: [
        'The Artemis III candidate regions are not included: NASA published their names but no coordinates.',
        'IM-3 is a region, shown at its centre.',
      ] },
    ],
    refs: ['sites', 'nssdca', 'lroc', 'wikipedia'], seeAlso: ['site-record'],
  },

  // ---------------- Results ----------------
  score: {
    title: 'Score', category: 'Results',
    summary: 'A number from 0 (worst) to 1 (best): the weighted average of five sub-scores for power, survival, communication and terrain.',
    sections: [
      { h: 'Description', p: ['The score ranks places and landing dates for one mission window. It is a comparison tool defined by the analysis team, not a published standard.', 'Here $s_i \\in [0, 1]$ is the sub-score of factor $i$ and $w_i \\ge 0$ its weight. The sum runs over the factors that have a value and a weight above 0.'], eq: 'S = \\frac{\\sum_i w_i\\, s_i}{\\sum_i w_i}' },
      { h: 'Sub-scores', table: {
        head: ['Factor', 'Quantity', 'Sub-score (0 = worst, 1 = best)'],
        rows: [
          ['Sunlight', 'share of the window $f_\\odot$', '$s_1 = f_\\odot$'],
          ['Longest night', 'duration $L_{\\text{dark}}$, window length $T$', '$s_2 = 1 - L_{\\text{dark}} / T$'],
          ['Earth in view', 'share of the window $f_\\oplus$', '$s_3 = f_\\oplus$'],
          ['Longest blackout', 'duration $L_{\\text{blackout}}$', '$s_4 = 1 - L_{\\text{blackout}} / T$'],
          ['Landing slope', 'slope $\\theta$', '$s_5 = \\max\\left( 0,\\ 1 - \\theta / 20^\\circ \\right)$'],
        ],
      } },
      { h: 'Reading the table', p: ['"Share" is $w_i s_i / \\sum_j w_j$: the part of the score that comes from that factor. The shares add up to the score. The ± after the score is its uncertainty.'] },
      { h: 'Limitations', p: [
        'The 20° slope scale is a display choice of the analysis team, not a published lander limit.',
        'Without terrain data the slope has no value and is left out of the average.',
        'A high score does not mean the place meets your minimum requirements: those are checked separately.',
      ] },
      { h: 'Landing criteria', p: ['The score ranks places by the weighted factors; it does not say whether a published criterion is met. Criteria are checked by the requirements (limits); their published values and sources are on the page "Landing criteria" [3].'] },
    ],
    refs: ['parameters', 'api', 'nasaReq'], seeAlso: ['score-weights', 'verdict', 'uncertainty'],
  },
  verdict: {
    title: 'Requirements check', category: 'Results',
    summary: 'Pass or fail against the minimum requirements you switched on. "At risk" means a limit holds at the exact point but breaks within the uncertainty.',
    sections: [
      { h: 'Description', p: ['The analysis server compares each parameter with its limit. The place passes only if every limit that could be checked is met.'] },
      { h: 'Possible answers', table: {
        head: ['Shown', 'Meaning'],
        rows: [
          ['meets all requirements', 'every limit is met at the point'],
          ['meets the checked requirements', 'the limits that could be checked are met; at least one could not be checked (data missing on the server)'],
          ['breaks a requirement', 'at least one limit is not met; the broken limits are listed with the value found'],
          ['At risk', 'the limit is met at the exact point but broken at a point within the landing accuracy, or when the skyline is shifted by its accuracy'],
          ['no requirements set', 'no limit is switched on, so there is nothing to check'],
        ],
      } },
    ],
    refs: ['parameters', 'api'], seeAlso: ['requirements', 'uncertainty'],
  },
  sunlight: {
    title: 'Sunlight', category: 'Results',
    summary: 'Share of the mission window with the Sun up: at least half of the solar disc above the local skyline. More sunlight means more power.',
    sections: [
      { h: 'Definition', p: [VISIBLE + 'A time step counts as sunlit when at least half of the solar disc is visible. Sunlight $f_\\odot$ is the share of the window made of sunlit steps, from 0 to 1.', 'Here $v_k$ is the visible fraction of the solar disc at time step $k$, $N$ the number of steps in the window, and the bracket is 1 when the condition holds and 0 otherwise.'], eq: 'f_\\odot = \\frac{1}{N} \\sum_{k=1}^{N} \\left[\\, v_k \\ge 0.5 \\,\\right]' },
      { h: 'Use', p: ['Sub-score: $s_1 = f_\\odot$. Limit: "Min sunlight".'] },
      { h: 'Validation', p: ['Against NASA\'s long-term LOLA visibility maps at 150 random points south of 85.5° S, using NASA\'s definition (any part of the disc visible): correlation r = 0.982, mean difference +0.010 [2].'] },
      { h: 'Limitations', p: [
        'The half-disc rule is stricter than NASA\'s "any part of the disc", so this value is lower than NASA\'s long-term maps by construction.',
        'Limb darkening is ignored: a half-hidden disc counts as half the light.',
        ...DISC_LIMITS,
      ] },
      { h: 'Landing criteria', p: ['Artemis III requires the surface to be lit for the whole surface stay, and NASA excludes areas where the Sun is visible less than 5 % of the time on its long-term maps [4]. In the navigator: the crewed preset sets "Max longest night" to 0 h; the long-term map is the layer "Sun visibility, long term".'] },
    ],
    refs: ['parameters', 'valAvgvisib', 'pgda69', 'nasaReq'], seeAlso: ['longest-night', 'terrain-horizon', 'nasa-visibility'],
  },
  'longest-night': {
    title: 'Longest night', category: 'Results',
    summary: 'The longest continuous time without sunlight inside the mission window, in hours. It sizes the battery and the thermal survival problem.',
    sections: [
      { h: 'Definition', p: ['The longest unbroken run of time steps that are not sunlit (less than half of the solar disc visible), inside the mission window, with $\\Delta t$ the time step (1 minute):'], eq: 'L_{\\text{dark}} = \\Delta t \\cdot \\max \\{\\, j - i \\;:\\; v_k < 0.5 \\ \\text{for all}\\ i \\le k < j \\,\\}' },
      { h: 'Use', p: ['Sub-score: $s_2 = 1 - L_{\\text{dark}} / T$, with $T$ the window length (1 = never dark, 0 = dark the whole window). Limit: "Max longest night".'] },
      { h: 'Limitations', p: [
        'Near the poles a point 100 m away can be in shadow much longer, so the uncertainty of this number can be as large as the number itself. Read the ± or the range.',
        ...DISC_LIMITS,
      ] },
      { h: 'Landing criteria', p: ['Artemis III: "require the surface to be lit for the duration of the surface stay" [3], which the crewed preset expresses as a longest night of 0 h. For a robotic lander the limit is the battery: energy needed $E = P_{\\text{load}} \\cdot L_{\\text{dark}}$ (shown as "battery needed" when a load is set). No general published value exists for robotic landers.'] },
    ],
    refs: ['parameters', 'api', 'nasaReq'], seeAlso: ['sunlight', 'uncertainty'],
  },
  'earth-in-view': {
    title: 'Earth in view', category: 'Results',
    summary: 'Share of the mission window with the Earth above the local skyline: the time a direct radio link to Earth is geometrically possible.',
    sections: [
      { h: 'Definition', p: [VISIBLE + 'A time step counts when at least half of the Earth\'s disc is visible and the Earth is above the antenna\'s minimum elevation (default 0°). The value $f_\\oplus$ is the share of the window made of such steps, from 0 to 1.', 'Here $v_k$ is the visible fraction of the Earth\'s disc and $e_k$ the Earth\'s elevation at time step $k$, $e_{\\min}$ the antenna\'s minimum elevation and $N$ the number of steps in the window.'], eq: 'f_\\oplus = \\frac{1}{N} \\sum_{k=1}^{N} \\left[\\, v_k \\ge 0.5 \\ \\wedge\\ e_k \\ge e_{\\min} \\,\\right]' },
      { h: 'Use', p: ['Sub-score: $s_3 = f_\\oplus$. Limit: "Min Earth in view".'] },
      { h: 'Validation', p: ['Against NASA\'s long-term LOLA Earth-visibility map at 150 random points south of 85.5° S, using NASA\'s definition (any part of the disc visible): correlation r = 0.996, mean difference +0.005 [2].'] },
      { h: 'Limitations', p: [
        'Earth above the horizon is not yet a usable link: ground-station availability (for example the Deep Space Network) is not included.',
        ...DISC_LIMITS,
      ] },
      { h: 'Landing criteria', p: ['Artemis III requires direct-with-Earth communication with no relay assumed, and NASA excludes areas where the Earth is visible less than 25 % of the time on its long-term maps [4]. In the navigator: the crewed preset sets "Min Earth in view" to 25 %; the long-term map is the layer "Earth visibility, long term".'] },
    ],
    refs: ['parameters', 'valAvgvisib', 'pgda69', 'nasaReq'], seeAlso: ['longest-blackout', 'nasa-visibility'],
  },
  'longest-blackout': {
    title: 'Longest blackout', category: 'Results',
    summary: 'The longest continuous time without the Earth in view inside the mission window, in hours: the longest stretch out of direct contact.',
    sections: [
      { h: 'Definition', p: ['The longest unbroken run of time steps without the Earth in view (as defined under "Earth in view"), inside the mission window:'], eq: 'L_{\\text{blackout}} = \\Delta t \\cdot \\max \\{\\, j - i \\;:\\; \\neg\\,\\text{Earth in view}_k \\ \\text{for all}\\ i \\le k < j \\,\\}' },
      { h: 'Use', p: ['Sub-score: $s_4 = 1 - L_{\\text{blackout}} / T$, with $T$ the window length. Limit: "Max longest blackout".'] },
      { h: 'Limitations', p: ['Ground-station availability is not included, so real contact gaps can be longer.', ...DISC_LIMITS] },
      { h: 'Landing criteria', p: ['Artemis III requires direct-with-Earth communication with no relay assumed [2]; NASA publishes no maximum blackout length, so the navigator sets no default. A mission with a relay can set the Earth weights to 0.'] },
    ],
    refs: ['parameters', 'nasaReq'], seeAlso: ['earth-in-view'],
  },
  'both-in-view': {
    title: 'Sunlight and Earth in view', category: 'Results',
    summary: 'Share of the mission window with sunlight and the Earth in view at the same time: time for powered, commandable operations.',
    sections: [
      { h: 'Definition', p: ['The share of time steps that are sunlit and have the Earth in view together. It is never larger than either of the two shares alone:'], eq: 'f_{\\odot\\oplus} = \\frac{1}{N} \\sum_{k=1}^{N} \\left[\\, \\text{sunlit}_k \\wedge \\text{Earth in view}_k \\,\\right] \\le \\min(f_\\odot,\\ f_\\oplus)' },
      { h: 'Use', p: ['Shown for context and available for colouring the sites. It is not one of the five scored factors.'] },
      { h: 'Landing criteria', p: ['Artemis III asks for both at once: surface lit for the stay and direct-with-Earth communication [2]. A value close to 1 meets both for the whole window.'] },
    ],
    refs: ['parameters', 'nasaReq'], seeAlso: ['sunlight', 'earth-in-view'],
  },
  countdowns: {
    title: 'Countdowns: sunset, sunrise, Earthset, Earthrise', category: 'Results',
    summary: 'Time from landing until the Sun, or the Earth, is first lost (sunset, Earthset) or first gained (sunrise, Earthrise), in hours.',
    sections: [
      { h: 'Definition', p: ['First sunset: time from landing to the first time step that is not sunlit; first sunrise: to the first step that is sunlit. First Earthset and first Earthrise: the same with the Earth in view. With $\\Delta t$ the time step and $k$ counted from landing:'], eq: 't_{\\text{sunset}} = \\Delta t \\cdot \\min\\{\\, k \\;:\\; v_k < 0.5 \\,\\}, \\qquad t_{\\text{sunrise}} = \\Delta t \\cdot \\min\\{\\, k \\;:\\; v_k \\ge 0.5 \\,\\}' },
      { h: 'Reading', table: {
        head: ['Shown', 'Meaning'],
        rows: [
          ['a number of hours', 'the Sun (or Earth) is up at landing and is lost after this time'],
          ['dark at landing / no Earth at landing', 'already lost at the landing time'],
          ['not during the stay', 'never lost inside the mission window'],
        ],
      } },
      { h: 'Landing criteria', p: ['No published threshold. For operations: the first sunset bounds the time on solar power after landing; landing in darkness (a first sunrise later than 0 h) means starting on batteries.'] },
    ],
    refs: ['parameters'], seeAlso: ['sunlight', 'earth-in-view'],
  },
  'sun-elevation': {
    title: 'Mean Sun elevation when lit', category: 'Results',
    summary: 'Average height of the Sun above the horizontal while the place is sunlit, in degrees.',
    sections: [
      { h: 'Definition', p: ['The mean of the Sun\'s elevation angle $h_k$ over the sunlit time steps of the mission window. Elevation is measured from the local horizontal plane, not from the terrain skyline:'], eq: '\\bar h_\\odot = \\frac{\\sum_k h_k \\left[ v_k \\ge 0.5 \\right]}{\\sum_k \\left[ v_k \\ge 0.5 \\right]}' },
      { h: 'Why it matters', p: ['It tells how the solar array must point (near the poles the Sun stays low, which favours vertical arrays) and how long the shadows are.'] },
      { h: 'Landing criteria', p: [
        'Apollo: "the Sun angle should be between 7 and 20 degrees behind the LM" during the landing approach, so that the crew could see the surface relief [2]. Artemis III: illumination along the approach trajectory is beneficial [3].',
        'These concern the Sun at the landing time (shown as the Sun elevation "At landing" in the Sun block), not the mean over the stay shown here.',
      ] },
    ],
    refs: ['parameters', 'apollo1968', 'nasaReq'], seeAlso: ['sunlight', 'ephemeris'],
  },
  'rock-abundance': {
    title: 'Rock abundance', category: 'Results',
    summary: 'Share of the ground covered by rocks larger than about 1 m, from Diviner night-time temperatures. A regolith indicator for landing hazards and surface operations.',
    sections: [
      { h: 'Definition', p: [
        'The fraction of the surface area covered by rock fragments larger than about 1 m, estimated by Bandfield et al. from Diviner night-time temperatures: rocks stay warm long after sunset while fine regolith cools quickly, so the mix of the two sets the measured multi-channel temperatures [1].',
        'Read at the clicked point from the Diviner level 3 map (128 pixels per degree, averaged by the analysis server to 32 pixels per degree, about 950 m), covering 80° S to 80° N. Poleward of 80° the map has no values and none is shown.',
      ] },
      { h: 'Reading the value', p: ['Most of the Moon is below 1 %. Young craters, their ejecta and steep slopes reach several percent, up to a few tens of percent on fresh crater walls. The value says nothing about boulders smaller than about 1 m or about the exact spot of the footpads.'] },
      { h: 'Use', p: ['Shown for context. It is not part of the score or of the requirements.'] },
      { h: 'Formula', p: ['The analysis server averages the valid pixels of each 4 by 4 block of the 128 pixels-per-degree map, with DN the stored value:'], eq: 'RA = \\frac{1}{n} \\sum_{\\text{valid}} 0.001 \\cdot DN, \\qquad \\text{missing}: DN = -32768' },
      { h: 'Landing criteria', p: [
        'No published numeric limit for rock abundance was found. Apollo asked for sites with relatively few craters, a smoothness criterion without a number [4]. The Nova-C lander must land free of hazards larger than 30 cm [5]: smaller than the rocks this map counts (larger than about 1 m), so a low value is necessary but not sufficient.',
        'As a reading aid: half of the mapped Moon is below 0.28 % and 98 % below about 1 % (this map). Values of several percent mark young craters and steep walls.',
      ] },
    ],
    refs: ['bandfield2011', 'divinerGdr', 'api', 'apollo1968', 'novaC'], seeAlso: ['h-parameter', 'surface-temperature', 'slope'],
  },
  'h-parameter': {
    title: 'H-parameter (thermal inertia)', category: 'Results',
    summary: 'How quickly the regolith gets denser with depth, from Diviner night-time cooling. Small H: dense, conductive near-surface regolith, higher thermal inertia. Large H: fluffy regolith, lower thermal inertia.',
    sections: [
      { h: 'Definition', p: [
        'Hayne et al. describe the regolith density $\\rho$ as rising from a surface value $\\rho_s$ to a deep value $\\rho_d$ with depth $z$ [1]:',
      ], eq: '\\rho(z) = \\rho_d - (\\rho_d - \\rho_s)\\, e^{-z/H}' },
      { h: 'Thermal inertia', p: [
        'Thermal inertia $I = \\sqrt{k \\rho c}$ (conductivity $k$, density $\\rho$, heat capacity $c$) measures how strongly the ground resists temperature changes. A small $H$ means the dense, more conductive regolith is close to the surface, so the near-surface thermal inertia is higher and the night-time surface stays warmer; a large $H$ means a thick fluffy layer, lower thermal inertia and colder nights. $H$ is the quantity the Diviner team mapped; it is shown instead of a single thermal inertia, which would also depend on temperature.',
      ] },
      { h: 'Source and coverage', p: ['Fitted by Hayne et al. to Diviner channel 7 (25 to 41 µm) night-time temperatures, map of 128 pixels per degree (PDS file hpar_global_128ppd), averaged by the analysis server to 32 pixels per degree. Covered from 70° S to 70° N; poleward of that no value is shown. Global mean about 7 cm [1].'] },
      { h: 'Use', p: ['Shown for context (regolith properties, thermal design). It is not part of the score.'] },
      { h: 'Landing criteria', p: ['No published landing threshold. Large values mark thick, loose regolith; small values (young crater ejecta and rays) mark denser, rockier ground. Half of the mapped Moon is between 6.6 and 7.4 cm (this map).'] },
    ],
    refs: ['hayne2017', 'api'], seeAlso: ['rock-abundance', 'surface-temperature'],
  },
  'surface-temperature': {
    title: 'Surface temperature', category: 'Results',
    summary: 'The highest and the average temperature of the ground at the place, from Diviner: measured on most of the Moon, from the Diviner thermal model south of 80° S. Not the temperature on the landing date.',
    sections: [
      { h: 'Whole Moon', p: [
        'Diviner Global Cumulative Product: bolometric brightness temperature measured by Diviner in bins of 0.5° and a quarter of an hour of local time, all nadir observations from July 2009 to April 2015 [1].',
        'Maximum: the highest value over the local times of the bin. Average: the mean over the lunar day, after filling hours of local time that were not observed by linear interpolation when the gap is at most 4 hours; with a longer gap no average is shown.',
      ] },
      { h: 'South of 80° S', p: ['Diviner Polar Resource Product: yearly maximum surface temperature and yearly average temperature 2 cm below the surface, calculated by the Diviner team\'s thermal model on terrain triangles about 0.7 km across; the value of the nearest triangle within 2 km is shown [2].'] },
      { h: 'Use', p: ['Shown for context (thermal design, volatiles). It is not part of the score. The two products differ (measured by local time vs modelled yearly values), so values can step at 80° S.'] },
      { h: 'Formula', p: ['With $T_\\ell$ the measured bolometric temperature in local-time bin $\\ell$ (96 bins of 15 minutes) and $\\tilde T_\\ell$ the same after filling gaps of at most 4 h by linear interpolation:'], eq: 'T_{\\max} = \\max_\\ell T_\\ell, \\qquad \\bar T = \\frac{1}{96} \\sum_{\\ell=1}^{96} \\tilde T_\\ell' },
      { h: 'Landing criteria', p: ['No published landing threshold: the limits come from the thermal design of each lander and crew system. Apollo chose the landing time so that Sun angle and surface temperature together left a launch window of about a day per month [4].'] },
    ],
    refs: ['williams2017', 'divinerPrp', 'api', 'apollo1968'], seeAlso: ['h-parameter', 'rock-abundance'],
  },
  slope: {
    title: 'Landing slope', category: 'Results',
    summary: 'Surface slope at the place from LOLA altitude data, in degrees. A regional indicator of landing safety, measured over 80 m or more.',
    sections: [
      { h: 'Definition', table: {
        head: ['Region', 'Source', 'Baseline'],
        rows: [
          ['South of 80° S', 'official LOLA slope map [2]', '80 m'],
          ['60° S to 80° S', 'computed from the LOLA altitude map by central differences [2]', '240 m'],
          ['Rest of the Moon', 'computed from the global LOLA altitude map by central differences [3]', '237 m'],
        ],
      } },
      { h: 'Use', p: ['Sub-score: $s_5 = \\max\\left( 0,\\ 1 - \\theta / 20^\\circ \\right)$ for a slope $\\theta$. Limit: "Max landing slope". The baseline in use is shown next to the value.'] },
      { h: 'Validation', p: ['Slope computed from the 80 m altitude map reproduces the official 80 m slope map: median absolute difference 0.10° to 0.17°, correlation 0.996 to 0.999 in four 16 km windows [4].'] },
      { h: 'Limitations', p: [
        'Slope depends on the distance it is measured over. No lunar map resolves boulders or the metre-scale slopes a footpad sees, so this is not a landing-safety certificate.',
        'Slopes from the coarser maps come out smoother than from the 80 m map.',
        'NASA\'s crewed requirement is stated over 100 m; our closest baseline is 80 m.',
        'Without the LOLA maps on the server the slope is "n/a", never 0.',
      ] },
      { h: 'Landing criteria', table: {
        head: ['Criterion', 'Baseline', 'Source'],
        rows: [
          ['General slope of the landing area below 2°', 'landing area (Apollo, 1968)', '[5]'],
          ['Landing slope below 10°', '100 m (Artemis III)', '[6]'],
          ['Slope for EVA below 20°', '2 km (Artemis III)', '[6]'],
          ['Terrain slope at touchdown below 10°, hazards above 30 cm avoided', 'footprint of the lander (Nova-C)', '[7]'],
        ],
      } },
      { h: 'Reading the criteria', p: ['Compare a criterion only with a slope measured over a similar baseline: the 80 m value is close to the Artemis 100 m baseline; the 237 m and 240 m values are smoother and will look flatter than the ground under a lander. The touchdown criteria (Nova-C) and 30 cm hazards are far below the resolution of any lunar map.'] },
    ],
    refs: ['parameters', 'pgda90', 'lolaGdr', 'maps', 'apollo1968', 'nasaReq', 'novaC'], seeAlso: ['elevation', 'mission-type', 'score'],
  },
  elevation: {
    title: 'Altitude', category: 'Results',
    summary: 'Altitude of the surface: height above the 1737.4 km reference sphere, from LOLA laser altimetry, in metres.',
    sections: [
      { h: 'Definition', p: ['Height above a sphere of radius 1737.4 km, read by bilinear interpolation from the finest LOLA altitude map that covers the point: 5 m pixels south of 86.7° S, 80 m to 80° S, 240 m to 60° S, 237 m elsewhere. With $r$ the distance of the surface from the centre of the Moon measured by the LOLA laser altimeter:'], eq: 'z = r - 1737.4\\ \\text{km}' },
      { h: 'Use', p: ['Shown for context. It also sets where the observer stands when the skyline is computed. It is not scored.'] },
      { h: 'Uncertainty', p: ['South of 80° S the ± comes from the LOLA height-error map (0.03 to 1.1 m). Elsewhere no height error is published with the maps, so none is shown.'] },
      { h: 'Landing criteria', p: ['No numeric limit on altitude itself. Apollo asked for approach paths without "large hills, tall cliffs or deep craters", which could give wrong signals to the landing radar [6]: use the altitude and slope layers to check the ground under the approach.'] },
    ],
    refs: ['parameters', 'maps', 'pgda90', 'pgda81', 'lolaGdr', 'apollo1968'], seeAlso: ['slope', 'terrain-horizon'],
  },
  'nasa-visibility': {
    title: 'NASA long-term visibility', category: 'Results',
    summary: 'NASA\'s long-term average Sun and Earth visibility for the spot, from LOLA. Shown for context next to our value for your dates.',
    sections: [
      { h: 'Definition', p: ['The share of time steps in which any part of the Sun\'s (or Earth\'s) disc is visible, averaged over 18.6 years at hourly steps, on 60 m pixels, with the LOLA terrain horizon. Available south of 85° S only [1]. With $v_k$ the visible fraction of the disc:'], eq: 'F = \\frac{1}{N} \\sum_{k=1}^{N} \\left[\\, v_k > 0 \\,\\right]' },
      { h: 'How it differs from our numbers', p: [
        'It is a long-term average; our values are for your mission window only.',
        'It counts any part of the disc; ours require at least half of it. Ours are lower by construction.',
      ] },
      { h: 'Landing criteria', p: ['NASA uses these long-term maps for Artemis III: areas with Earth visibility below 25 % and solar visibility below 5 % are excluded [3].'] },
    ],
    refs: ['pgda69', 'valAvgvisib', 'nasaReq'], seeAlso: ['sunlight', 'earth-in-view'],
  },
  'ra-dec': {
    title: 'Right ascension and declination', category: 'Results',
    summary: 'Where the Sun or the Earth is on the celestial sphere as seen from the centre of the Moon at the landing time: two angles in the fixed J2000 axes, independent of the landing place.',
    sections: [
      { h: 'Definition', p: [
        'The analysis server takes the vector from the centre of the Moon to the centre of the body from the JPL DE440 ephemeris, corrected for light time and stellar aberration (the same correction as the azimuth and elevation), and expresses it in the J2000 axes, which are the axes of the International Celestial Reference Frame: $x$ toward the vernal equinox of J2000, $z$ toward the celestial north pole [1][2].',
        'With the vector $\\mathbf{r} = (x, y, z)$, right ascension $\\alpha$ is the angle around the celestial equator and declination $\\delta$ the angle above it:',
      ], eq: '\\alpha = \\operatorname{atan2}(y,\\ x) \\bmod 360^\\circ, \\qquad \\delta = \\arcsin\\!\\left( \\frac{z}{\\lvert \\mathbf{r} \\rvert} \\right)' },
      { h: 'Reading the values', p: [
        'Right ascension is shown in hours, minutes and seconds ($24\\,\\text{h} = 360^\\circ$) and in degrees; declination in degrees, positive north of the celestial equator.',
        'The two angles are selenocentric: they are the same for every place on the Moon. Seen from a place on the surface the Earth can be shifted by up to $0.26^\\circ$ (parallax of one lunar radius); the Sun by less than $0.001^\\circ$. The azimuth and elevation in the rows above do include the place.',
        'Unlike azimuth and elevation, these angles do not turn with the Moon: they say in front of which stars the body is. Seen from the Moon the Earth goes once around the sky in about 27.3 days, the Sun in a year.',
      ] },
      { h: 'Validation', p: ['With the light-time correction alone the values agree with the astrometric right ascension and declination of JPL Horizons (observer at the centre of the Moon) to $0.000\\,001^\\circ$ for both bodies at three dates in November and December 2026. The stellar aberration included in the values shown moves them by up to $0.007^\\circ$ from that astrometric position, as expected [3].'] },
    ],
    refs: ['de440', 'spice', 'api'], seeAlso: ['sun-position', 'earth-position', 'ephemeris'],
  },
  'sun-position': {
    title: 'Sun position', category: 'Results',
    summary: 'Where the Sun is in the sky of the place: elevation, azimuth, distance and apparent size, at the landing time and over the stay.',
    sections: [
      { h: 'Definition', p: [
        'Angles are topocentric, in the local East-North-Up frame of the place. Elevation $h$ is measured from the local tangent plane of the 1737.4 km reference sphere, positive upwards. Azimuth $A$ is measured clockwise from local north (the direction toward the lunar north pole), $0^\\circ \\le A < 360^\\circ$ [1].',
        'Both angles are geometric: they ignore the terrain. A positive elevation therefore does not mean that the Sun is in view. Whether it is in view is given by the visible part of the disc, which includes the terrain skyline.',
      ] },
      { h: 'Apparent size', p: ['The angular radius of the solar disc follows from the Sun\'s radius $R_\\odot = 695\\,700\\ \\text{km}$ and the distance $d$ from the place to the Sun:'], eq: '\\rho_\\odot = \\arcsin\\!\\left( \\frac{R_\\odot}{d} \\right)' },
      { h: 'Values shown', table: {
        head: ['Row', 'Meaning'],
        rows: [
          ['Elevation, azimuth', 'direction of the centre of the Sun at the landing time'],
          ['Distance', 'from the place to the centre of the Sun at the landing time'],
          ['Angular radius', '$\\rho_\\odot$ at the landing time'],
          ['Lowest, highest elevation', 'extremes of $h$ over the mission window'],
        ],
      } },
      { h: 'Landing criteria', p: ['Apollo: during the landing approach "the Sun angle should be between 7 and 20 degrees behind the LM", so that the relief stays visible [5]. Artemis III: illumination along the approach trajectory is beneficial [6]. Compare with the elevation and azimuth "At landing".'] },
    ],
    refs: ['contract', 'de440', 'spice', 'valHorizons', 'apollo1968', 'nasaReq'], seeAlso: ['ephemeris', 'sunlight', 'sun-elevation', 'time-series'],
  },
  'earth-position': {
    title: 'Earth position', category: 'Results',
    summary: 'Where the Earth is in the sky of the place: elevation, azimuth, distance, apparent size and phase, at the landing time and over the stay.',
    sections: [
      { h: 'Definition', p: [
        'Angles are topocentric, in the local East-North-Up frame of the place. Elevation $h$ is measured from the local tangent plane of the 1737.4 km reference sphere; azimuth $A$ clockwise from local north (toward the lunar north pole), $0^\\circ \\le A < 360^\\circ$ [1].',
        'Both angles are geometric: they ignore the terrain. Whether the Earth is in view is given by the visible part of the disc, which includes the terrain skyline.',
        'Seen from one place on the Moon the Earth stays in nearly the same part of the sky and only sways slowly (libration), which is why near the poles it hovers at the horizon.',
      ] },
      { h: 'Apparent size and phase', p: [
        'The angular radius follows from the Earth\'s radius $R_\\oplus = 6378.1366\\ \\text{km}$ and the distance $d$. The illuminated part of the Earth\'s disc, $k$, follows from the phase angle $\\varphi$ (Sun, Earth, observer) [1]:',
        'A full Earth has $k = 1$, a new Earth $k = 0$.',
      ], eq: '\\rho_\\oplus = \\arcsin\\!\\left( \\frac{R_\\oplus}{d} \\right), \\qquad k = \\frac{1 + \\cos\\varphi}{2}' },
      { h: 'Values shown', table: {
        head: ['Row', 'Meaning'],
        rows: [
          ['Elevation, azimuth', 'direction of the centre of the Earth at the landing time'],
          ['Distance', 'from the place to the centre of the Earth at the landing time'],
          ['Angular radius', '$\\rho_\\oplus$ at the landing time'],
          ['Illuminated part (phase)', '$k$ at the landing time'],
          ['Mean elevation when in view', 'mean of $h$ over the time steps with the Earth in view'],
          ['Lowest, highest elevation', 'extremes of $h$ over the mission window'],
        ],
      } },
      { h: 'Landing criteria', p: ['Artemis III requires direct-with-Earth communication, with no relay assumed [5]. No minimum Earth elevation is published; the antenna mask (default 0°) is a setting of the analysis.'] },
    ],
    refs: ['contract', 'de440', 'spice', 'valHorizons', 'nasaReq'], seeAlso: ['ephemeris', 'earth-in-view', 'time-series'],
  },
  'visibility-windows': {
    title: 'Periods in view', category: 'Results',
    summary: 'The start, end and length of every period with sunlight, and of every period with the Earth in view, during the stay; and how often these periods come back.',
    sections: [
      { h: 'Definition', p: [
        'A sunlit period is an unbroken run of time steps with at least half of the solar disc above the skyline. A period with the Earth in view is an unbroken run of steps with at least half of the Earth\'s disc visible and the Earth above the antenna\'s minimum elevation. The analysis server lists the exact start and end of each [1].',
        'Length of a period: end minus start, shown in hours below two days and in days above.',
      ] },
      { h: 'Repeats every', p: [
        'How often the pattern of periods comes back, over the 90 days that follow the landing, whatever the stay. For this the analysis server is asked for the same periods over 90 days, with a 10 min step. The navigator turns them into a series $x(t)$, 1 when the body is in view and 0 when not, every hour, and finds the shift $L$ at which the series best matches itself: the highest autocorrelation $r(L)$ for $L$ between 10 and 45 days ($\\bar x$ is the mean of the series, $N$ its number of hours).',
        'Counting sunrises would not work near the poles: a ridge can hide the Sun for a few hours in the middle of a lunar day, which would count as an extra sunrise. The autocorrelation looks at the whole pattern, so such short interruptions barely move it.',
        'The 10 to 45 day search range (monthly cycles only) and the threshold $r \\ge 0.5$ below which no cycle is shown are our choices, not published values. The result has a resolution of 1 h.',
      ], eq: 'r(L) = \\frac{\\frac{1}{N-L}\\sum_{i=0}^{N-L-1} (x_i - \\bar x)(x_{i+L} - \\bar x)}{\\frac{1}{N}\\sum_{i=0}^{N-1} (x_i - \\bar x)^2}, \\qquad P = \\arg\\max_{L} r(L)' },
      { h: 'Expected values', p: [
        'For comparison only (not used in the computation): the Sun comes back once per synodic month, 29.53 days on average [3]; the navigator finds 29.5 to 29.6 days away from the poles. The Earth hardly moves in the sky of a given place; it rises and sets only near the edge of the near side and near the poles, where the librations carry it across the horizon, with periods close to the anomalistic month (27.55 days, longitude libration) and the draconic month (27.21 days, latitude libration) [3]. Near the south pole the latitude libration dominates: the navigator finds 27.2 days there.',
      ] },
      { h: 'Reading', p: [
        'The end of a sunlit period is a sunset and the start of the next one a sunrise; likewise Earthset and Earthrise.',
        'A period that starts exactly at the landing time, or ends exactly at the end of the stay, is cut by the mission window: the Sun (or Earth) was already up before, or stays up after. Its length is then the part inside the stay.',
        'No value is shown when the body stays in view, or out of view, for all 90 days, or when no shift reaches $r = 0.5$ (no regular cycle).',
      ] },
      { h: 'Limitations', p: ['Times have the resolution of the time step: 60 s for the periods of the stay; the repeat period is resolved to 1 h.', 'Ground-station availability is not included in the Earth periods.', 'The repeat period is an average over the 90 days: single cycles differ from it by up to several hours, because the Moon\'s orbit is elliptical and perturbed [3]. Near the poles the terrain can shift it further (for example 30.2 days for the Sun at 89.45° S, 137.31° W from 15 Nov 2026, against 29.5 days at 85.4° S, 30° E).'] },
    ],
    refs: ['contract', 'parameters', 'meeus1998'], seeAlso: ['sunlight', 'earth-in-view', 'countdowns'],
  },
  'solar-energy': {
    title: 'Irradiance and solar energy', category: 'Results',
    summary: 'Sunlight power reaching a surface that always faces the Sun: the average over the stay in W/m², and the total in kWh/m².',
    sections: [
      { h: 'Definition', p: [
        'The energy reaching one square metre that always faces the Sun, over the mission window of length $T$:',
        'Here $S_0 = 1360.8 \\pm 0.5\\ \\text{W/m}^2$ is the solar constant at 1 AU [2], $d(t)$ the distance to the Sun and $v(t)$ the visible part of the solar disc. The mean irradiance is $E / T$.',
      ], eq: 'E = \\int_{t_0}^{t_0 + T} S_0 \\left( \\frac{1\\ \\text{AU}}{d(t)} \\right)^{2} v(t)\\, \\mathrm{d}t' },
      { h: 'Use', p: ['Shown for context: it is what a Sun-tracking array could collect before its efficiency. It is not one of the scored factors.'] },
      { h: 'Limitations', p: [
        'Limb darkening is ignored: a half-hidden disc counts as half the light.',
        'No array area, efficiency or pointing loss is applied.',
      ] },
    ],
    refs: ['parameters', 'kopp2011'], seeAlso: ['sunlight', 'longest-night'],
  },
  'time-series': {
    title: 'Plot over time and CSV', category: 'Results',
    summary: 'The Sun and the Earth in the sky of the place through the whole stay, as a chart and as a table you can download.',
    sections: [
      { h: 'Description', p: [
        'The analysis server computes the position of the Sun and the Earth every 10 minutes from the landing time to the end of the stay, with the mast height you set. The chart shows one quantity at a time for both bodies, because they share its unit.',
      ] },
      { h: 'Quantities', table: {
        head: ['Quantity', 'Meaning'],
        rows: [
          ['Elevation above the horizontal', 'geometric elevation, terrain ignored; the line at $0^\\circ$ is the local horizontal, not the skyline'],
          ['Azimuth, clockwise from north', '$0^\\circ$ to $360^\\circ$; the line is broken where it passes north'],
          ['Visible part of the disc', 'share of the disc above the terrain skyline, 0 to 100 %'],
        ],
      } },
      { h: 'CSV file', table: {
        head: ['Column', 'Unit', 'Content'],
        rows: [
          ['time_utc', 'ISO 8601, UTC', 'time of the step'],
          ['sun_az_deg, earth_az_deg', 'degree', 'azimuth, clockwise from local north'],
          ['sun_el_deg, earth_el_deg', 'degree', 'elevation above the local horizontal'],
          ['sun_visible_frac, earth_visible_frac', '0 to 1', 'visible part of the disc, terrain included'],
          ['sun_dist_km, earth_dist_km', 'km', 'distance from the place'],
          ['sun_radius_deg, earth_radius_deg', 'degree', 'apparent angular radius'],
          ['earth_phase_frac', '0 to 1', 'illuminated part of the Earth\'s disc'],
        ],
      } },
      { h: 'Limitations', p: [
        'The file name carries the latitude, the longitude and the landing time; the other settings are not stored in the file.',
        'The 10-minute step is coarser than the 60 s used for the numbers in the other blocks.',
      ] },
    ],
    refs: ['contract', 'api'], seeAlso: ['sun-position', 'earth-position', 'ephemeris'],
  },
  'site-record': {
    title: 'Site record', category: 'Results',
    summary: 'What is on file for a known landing site: who landed there and when, the cited coordinate, and precomputed values for the chosen date.',
    sections: [
      { h: 'Description', p: [
        'The record shows the site you point at or chose in the list. Its numbers come from the precomputed site-by-date table for the chosen landing date; with the analysis server running the table is recomputed with your settings.',
        'Slope and altitude are the LOLA values at the cited coordinate. The link at the bottom opens the source of the coordinate.',
      ] },
      { h: 'How it differs from "Can we land there?"', p: ['"Can we land there?" is the full evaluation of the chosen place, with uncertainties and the requirements check. The site record is the short catalogue entry.'] },
    ],
    refs: ['sites', 'api'], seeAlso: ['known-sites', 'score'],
  },

  // ---------------- Methods ----------------
  ephemeris: {
    title: 'Sun and Earth directions', category: 'Methods',
    summary: 'Where the Sun and the Earth are in the sky of a lunar site: JPL DE440 ephemeris through the SPICE toolkit.',
    sections: [
      { h: 'Method', p: [
        'Directions come from the JPL DE440 planetary and lunar ephemeris [1] and the lunar orientation kernels, read with SPICE [2]. Frame: MOON_ME (Mean Earth / Polar Axis). Aberration correction: LT+S (light time and stellar aberration).',
        'Kernels: naif0012.tls, pck00011.tpc, de440s.bsp, moon_pa_de440_200625.bpc, moon_de440_250416.tf.',
      ] },
      { h: 'Constants', table: {
        head: ['Quantity', 'Value', 'Source'],
        rows: [
          ['Moon radius', '1737.4 km', 'pck00011.tpc'],
          ['Sun radius', '695 700 km', 'pck00011.tpc'],
          ['Earth radius', '6378.1366 km', 'pck00011.tpc'],
          ['Solar constant $S_0$', '$1360.8 \\pm 0.5\\ \\text{W/m}^2$ at 1 AU', 'Kopp and Lean 2011 [3]'],
          ['Astronomical unit', '149 597 870.7 km', 'IAU 2012'],
        ],
      } },
      { h: 'Validation', p: ['Compared with JPL Horizons for 5 sites, 2 bodies and 12 instants between 1 Nov and 26 Dec 2026: largest angular difference 0.000026° at full precision and 0.00069° as served (angles rounded to 0.001°). Tolerance: 0.01° [4].'] },
    ],
    refs: ['de440', 'spice', 'kopp2011', 'valHorizons', 'parameters'], seeAlso: ['terrain-horizon'],
  },
  'terrain-horizon': {
    title: 'Terrain horizon', category: 'Methods',
    summary: 'The skyline seen from a place, traced over LOLA altitude maps out to 200 km. It decides when the Sun and the Earth are hidden.',
    sections: [
      { h: 'Method', p: ['From the observer (mast height above the surface) the terrain is ray-marched in every direction over the LOLA altitude maps out to 200 km; the highest elevation angle found in each direction is the skyline. Target accuracy: 0.1°.'] },
      { h: 'Maps used', table: {
        head: ['', 'South of 86.7° S', '80 to 86.7° S', '60 to 80° S', 'Rest of the Moon'],
        rows: [
          ['Near terrain (≤ 10 km)', '5 m [2]', '80 m [1]', '240 m [1]', '237 m global [3]'],
          ['Far terrain (to 200 km)', '80 m', '80 m', '240 m', '237 m global'],
        ],
      } },
      { h: 'Validation', p: ['Long-term visibility computed with this skyline, against NASA\'s LOLA visibility maps at 150 random points south of 85.5° S (NASA\'s definition, any part of the disc): Sun r = 0.982, mean difference +0.010; Earth r = 0.996, mean difference +0.005 [4].'] },
      { h: 'Limitations', p: [
        'Without the maps on the server the horizon is a smooth sphere seen from the mast height, and polar results are optimistic. The results say which horizon was used.',
        'The skyline is taken as flat across the width of the Sun\'s and the Earth\'s disc.',
        'Not included: thermal environment, permanently shadowed regions.',
      ] },
    ],
    refs: ['pgda90', 'pgda81', 'lolaGdr', 'valAvgvisib', 'maps', 'parameters'], seeAlso: ['mast-height', 'uncertainty'],
  },
  uncertainty: {
    title: 'Uncertainty', category: 'Methods',
    summary: 'The ± after a number: how much it changes if the lander touches down up to 100 m away, or if the skyline is off by 0.1°.',
    sections: [
      { h: 'Method', table: {
        head: ['Input', 'Default', 'Represents', 'Propagation'],
        rows: [
          ['Position uncertainty', '100 m', 'landing accuracy: the lander does not touch down on the exact point', 'parameters re-evaluated at 8 points on a ring of this radius; position term = largest change'],
          ['Horizon uncertainty', '0.1°', 'accuracy of the terrain skyline', 'skyline shifted up and down by this angle; horizon term = largest change'],
        ],
      }, eq: '\\sigma = \\sqrt{ \\sigma_{\\text{pos}}^{2} + \\sigma_{\\text{hor}}^{2} }' },
      { h: 'Symbols', p: ['$\\sigma_{\\text{pos}}$ is the position term, $\\sigma_{\\text{hor}}$ the horizon term and $\\sigma$ the uncertainty shown after the number, all in the unit of the parameter.'] },
      { h: 'Range instead of ±', p: ['When a ± would cross a physical limit (a negative night length, a share above 100 %), the lowest and highest values found are shown as a range instead.'] },
      { h: 'At risk', p: ['A minimum requirement that is met at the exact point but broken somewhere within the uncertainty is reported as "at risk".'] },
      { h: 'Limitations', p: [
        'Both defaults are choices of the analysis team, not requirements.',
        'Altitude adds the LOLA height error in quadrature.',
        'Not included: errors in the Sun and Earth directions (below 0.0001°), map artefacts beyond the height-error map, and the flat-skyline approximation across the disc width.',
      ] },
      { h: 'Landing criteria', p: ['Artemis III requires landing within 100 m of the target [4]: this is why the default landing accuracy of the uncertainty is 100 m. Apollo 11 had a landing ellipse of 17 by 5 km [4].'] },
    ],
    refs: ['parameters', 'api', 'valHorizons', 'nasaReq'], seeAlso: ['verdict', 'terrain-horizon'],
  },
  'layer-slope': {
    title: 'Slope', category: 'Map layers',
    summary: 'Surface slope of the whole Moon: computed from the global LOLA altitude map, with the official 80 m slope map south of 80° S.',
    sections: [
      { h: 'Data', table: { head: ['Region', 'Source', 'Baseline'], rows: [
        ['Whole Moon', 'computed from LOLA LDEM_128 [1]', '237 m, then averaged to the 3.8 km image pixel'],
        ['South of 80° S', 'official LOLA slope map LDSM_80S_80MPP_ADJ [2]', '80 m'],
      ] } },
      { h: 'Formula', p: ['Central differences over one pixel of the altitude map $z$ (pixel size $\\Delta = R\\,\\pi/(180 \\cdot 128) = 237$ m, $R = 1737.4$ km); the east-west spacing shrinks with the cosine of the latitude $\\varphi$:'], eq: '\\theta = \\arctan\\sqrt{\\left(\\frac{z_{i,j+1} - z_{i,j-1}}{2\\,\\Delta \\cos\\varphi}\\right)^{2} + \\left(\\frac{z_{i+1,j} - z_{i-1,j}}{2\\,\\Delta}\\right)^{2}}' },
      { h: 'Colour scale', p: ['The palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile $b_0 \\dots b_4$ of the whole-Moon values, each pixel weighted by $\\cos\\varphi$ so that every colour covers about a quarter of the surface; a value $x$ gets the palette position $c(x)$ by linear interpolation between them. The three numbers under the bar are $b_0$, $b_2$ and $b_4$ [3].'], eq: 'c(x) = \\operatorname{interp}\\big(x;\\ (b_0, b_1, b_2, b_3, b_4) \\mapsto (0, \\tfrac14, \\tfrac12, \\tfrac34, 1)\\big)' },
      { h: 'Landing criteria', p: ['Apollo: general slope of the landing area below 2° [4]. Artemis III: below 10° over 100 m for landing, below 20° over 2 km for EVA [5]. Nova-C: below 10° at touchdown [6]. Details and baselines: "Landing slope" and "Landing criteria".'] },
      { h: 'Limitations', p: ['A slope over 237 m and then averaged to 3.8 km is much smoother than the ground under a lander: use the clicked value (finer map) and the 80 m map near the south pole to judge a site.'] },
    ],
    refs: ['lolaGdr', 'pgda90', 'layersCode', 'apollo1968', 'nasaReq', 'novaC'], seeAlso: ['slope', 'landing-criteria'],
  },
  'layer-altitude': {
    title: 'Altitude', category: 'Map layers',
    summary: 'Height of the surface above the 1737.4 km reference sphere, read from the LOLA laser altimeter maps.',
    sections: [
      { h: 'Data', table: { head: ['Region', 'Source', 'Pixel'], rows: [
        ['Whole Moon', 'LOLA LDEM_128 [1]', '237 m (shown at 3.8 km)'],
        ['South of 80° S', 'LOLA LDEM_80S_80MPP_ADJ [2]', '80 m (shown at about 300 m)'],
      ] } },
      { h: 'Formula', p: ['Read, not computed. The global map stores $DN$ with $r = 1737.4\\ \\text{km} + 0.5\\,DN$ metres, so the altitude is:'], eq: 'z = 0.5 \\cdot DN\\ \\text{m}' },
      { h: 'Colour scale', p: ['The palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile $b_0 \\dots b_4$ of the whole-Moon values, each pixel weighted by $\\cos\\varphi$ so that every colour covers about a quarter of the surface; a value $x$ gets the palette position $c(x)$ by linear interpolation between them. The three numbers under the bar are $b_0$, $b_2$ and $b_4$ [3].'], eq: 'c(x) = \\operatorname{interp}\\big(x;\\ (b_0, b_1, b_2, b_3, b_4) \\mapsto (0, \\tfrac14, \\tfrac12, \\tfrac34, 1)\\big)' },
      { h: 'Landing criteria', p: ['No limit on altitude itself. Apollo asked for approach paths without large hills, tall cliffs or deep craters [4]: read this layer along the approach direction.'] },
    ],
    refs: ['lolaGdr', 'pgda90', 'layersCode', 'apollo1968'], seeAlso: ['elevation', 'layer-slope'],
  },
  'layer-visibility': {
    title: 'Sun and Earth visibility, long term', category: 'Map layers',
    summary: 'Share of time in which any part of the Sun (or the Earth) is above the horizon over one 18.6-year lunar cycle: computed by this project on a smooth sphere for the whole Moon, NASA maps with terrain south of 85° S.',
    sections: [
      { h: 'Definition', p: ['With $v_k$ the visible fraction of the disc at time step $k$ (the same definition as the NASA maps):'], eq: 'F = \\frac{1}{N} \\sum_{k=1}^{N} \\left[\\, v_k > 0 \\,\\right]' },
      { h: 'Whole Moon (computed)', p: ['Grid of 2° cells, positions every 6 hours from 2020 to 2038 from the JPL DE440 ephemeris, horizon of a smooth sphere seen from 2 m: $h_{\\text{hor}} = -\\arccos\\big(R/(R + 2\\ \\text{m})\\big)$. Hills are ignored, which matters little away from the poles where the Sun and the Earth rise high [3].'] },
      { h: 'South of 85° S (read)', p: ['NASA average visibility maps AVGVISIB_85S_060M_201608 (Sun) and _EARTH, 60 m pixels, hourly steps over 18.6 years with the real LOLA terrain [2].'] },
      { h: 'Colour scale', p: ['Linear from 0 % to 100 %: the value is a share of time.'] },
      { h: 'Landing criteria', p: ['Artemis III excludes areas with Earth visibility below 25 % and solar visibility below 5 % on these long-term maps [4].'] },
      { h: 'Limitations', p: ['A long-term average, not the sunlight or the Earth link on your landing date (those are in the Sun and Earth results). On the whole-Moon part every place sees the Sun about half of the time, so the Sun layer is nearly uniform away from the poles; the Earth layer shows the near side (always) and the far side (never).'] },
    ],
    refs: ['de440', 'pgda69', 'layersCode', 'nasaReq'], seeAlso: ['nasa-visibility', 'sunlight', 'earth-in-view'],
  },
  'layer-psr': {
    title: 'Permanently shadowed regions', category: 'Map layers',
    summary: 'Places the Sun never reaches, at both poles: where the water ice is expected, and where a solar-powered lander cannot operate.',
    sections: [
      { h: 'Data', table: { head: ['Region', 'Source', 'Resolution'], rows: [
        ['Both poles, poleward of 65°', 'LOLA LPSR_65N_240M_201608 and LPSR_65S_240M_201608 [1]', '240 m'],
        ['South of 80° S', 'outlines larger than 1 km², LPSR_80S_20MPP_ADJ [2]', '20 m data'],
      ] } },
      { h: 'Definition', p: ['A pixel is permanently shadowed when the Sun stays below its terrain horizon for the whole 18.6-year cycle, computed by the LOLA team from LOLA topography [3]. The 240 m maps store $DN = \\pm 20000$ with the flag $0.5 + 2.5 \\cdot 10^{-5} DN$ = 1 (shadow) or 0 [1].'] },
      { h: 'Landing criteria', p: ['Artemis III requires the surface to be lit for the whole stay and excludes areas with solar visibility below 5 % [4]: a permanently shadowed region fails both. Science missions to the ice may target them on purpose with other power sources.'] },
    ],
    refs: ['lolaIllum', 'pgda90', 'pgda69', 'nasaReq'], seeAlso: ['layer-visibility', 'sunlight'],
  },
  'layer-temperature': {
    title: 'Surface temperature', category: 'Map layers',
    summary: 'Highest and average temperature of the ground: Diviner measurements for the whole Moon, Diviner thermal model south of 80° S.',
    sections: [
      { h: 'Whole Moon (measured)', p: ['Diviner Global Cumulative Product: bolometric brightness temperature in bins of 0.5° and 15 minutes of local time, all nadir data from July 2009 to April 2015 [1]. With $T_\\ell$ the value in local-time bin $\\ell$ and $\\tilde T_\\ell$ the same after filling gaps of at most 4 h by linear interpolation (longer gaps: blank):'], eq: 'T_{\\max} = \\max_\\ell T_\\ell, \\qquad \\bar T = \\frac{1}{96} \\sum_{\\ell=1}^{96} \\tilde T_\\ell' },
      { h: 'South of 80° S (modelled)', p: ['Diviner Polar Resource Product: yearly maximum surface temperature and yearly average 2 cm below the surface, from the Diviner team thermal model on terrain triangles about 0.7 km across; each pixel takes the nearest triangle within 2 km [2].'] },
      { h: 'Colour scale', p: ['The palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile $b_0 \\dots b_4$ of the whole-Moon values, each pixel weighted by $\\cos\\varphi$ so that every colour covers about a quarter of the surface; a value $x$ gets the palette position $c(x)$ by linear interpolation between them. The three numbers under the bar are $b_0$, $b_2$ and $b_4$ [3].'], eq: 'c(x) = \\operatorname{interp}\\big(x;\\ (b_0, b_1, b_2, b_3, b_4) \\mapsto (0, \\tfrac14, \\tfrac12, \\tfrac34, 1)\\big)' },
      { h: 'Landing criteria', p: ['No published landing threshold: limits come from the thermal design of each lander. Apollo chose the landing time so that Sun angle and surface temperature together left about one launch day per month [4].'] },
      { h: 'Limitations', p: ['Two different products meet at 80° S (measured by local time vs modelled yearly values), so the colours can step there. Not the temperature on your landing date.'] },
    ],
    refs: ['williams2017', 'divinerPrp', 'layersCode', 'apollo1968'], seeAlso: ['surface-temperature'],
  },
  'layer-rock-abundance': {
    title: 'Rock abundance', category: 'Map layers',
    summary: 'Share of the ground covered by rocks larger than about 1 m, from Diviner night-time temperatures, 80° S to 80° N.',
    sections: [
      { h: 'Data', p: ['Diviner level 3 map dgdr_ra_avg_cyl_128 (Bandfield et al.), 128 pixels per degree, 80° S to 80° N [2]. Rocks stay warm after sunset while fine regolith cools quickly; the mix sets the measured multi-channel night-time temperatures, from which the rock fraction is fitted [1].'] },
      { h: 'Formula', p: ['Read, then averaged over the valid pixels of 4 by 4 blocks (about 0.95 km):'], eq: 'RA = \\frac{1}{n} \\sum_{\\text{valid}} 0.001 \\cdot DN' },
      { h: 'Colour scale', p: ['The palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile $b_0 \\dots b_4$ of the whole-Moon values, each pixel weighted by $\\cos\\varphi$ so that every colour covers about a quarter of the surface; a value $x$ gets the palette position $c(x)$ by linear interpolation between them. The three numbers under the bar are $b_0$, $b_2$ and $b_4$ [3].'], eq: 'c(x) = \\operatorname{interp}\\big(x;\\ (b_0, b_1, b_2, b_3, b_4) \\mapsto (0, \\tfrac14, \\tfrac12, \\tfrac34, 1)\\big)' },
      { h: 'Landing criteria', p: ['No published numeric limit was found. Apollo asked for sites with relatively few craters [4]; Nova-C must avoid hazards larger than 30 cm [5], smaller than the rocks this map counts, so low values are necessary but not sufficient.'] },
      { h: 'Limitations', p: ['Nothing is drawn poleward of 80°: the product does not cover the poles.'] },
    ],
    refs: ['bandfield2011', 'divinerGdr', 'layersCode', 'apollo1968', 'novaC'], seeAlso: ['rock-abundance', 'layer-h-parameter'],
  },
  'layer-h-parameter': {
    title: 'Thermal inertia (H-parameter)', category: 'Map layers',
    summary: 'How quickly the regolith gets denser with depth, from Diviner night-time cooling, 70° S to 70° N. Small H: denser near-surface regolith, higher thermal inertia.',
    sections: [
      { h: 'Model', p: ['Density $\\rho$ rises from a surface value $\\rho_s$ to a deep value $\\rho_d$ over the scale $H$, fitted to Diviner channel 7 (25 to 41 µm) night-time temperatures [1]:'], eq: '\\rho(z) = \\rho_d - (\\rho_d - \\rho_s)\\, e^{-z/H}, \\qquad I = \\sqrt{k \\rho c}' },
      { h: 'Data', p: ['Map hpar_global_128ppd (Hayne et al. 2017), 128 pixels per degree, stored as $H = 1.526 \\cdot 10^{-5} DN + 0.5$ m, averaged over 4 by 4 blocks [1]. Thermal inertia $I$ depends on the density through conductivity $k$ and heat capacity $c$, so a smaller $H$ means higher near-surface thermal inertia.'] },
      { h: 'Colour scale', p: ['The palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile $b_0 \\dots b_4$ of the whole-Moon values, each pixel weighted by $\\cos\\varphi$ so that every colour covers about a quarter of the surface; a value $x$ gets the palette position $c(x)$ by linear interpolation between them. The three numbers under the bar are $b_0$, $b_2$ and $b_4$ [2].'], eq: 'c(x) = \\operatorname{interp}\\big(x;\\ (b_0, b_1, b_2, b_3, b_4) \\mapsto (0, \\tfrac14, \\tfrac12, \\tfrac34, 1)\\big)' },
      { h: 'Landing criteria', p: ['No published landing threshold. Use it as context for regolith properties and thermal design.'] },
      { h: 'Limitations', p: ['Nothing is drawn poleward of 70°: the product does not cover the poles.'] },
    ],
    refs: ['hayne2017', 'layersCode'], seeAlso: ['h-parameter', 'layer-rock-abundance'],
  },
  'layer-daynight': {
    title: 'Day and night at landing time', category: 'Map layers',
    summary: 'The half of the Moon in darkness at the landing time, drawn from the point that has the Sun overhead.',
    sections: [
      { h: 'Formula', p: ['With $(\\varphi_s, \\lambda_s)$ the sub-solar point from the analysis (JPL DE440 ephemeris), the Sun elevation $h$ at latitude $\\varphi$ and longitude $\\lambda$ on a smooth sphere is given below; night is where $h < 0$. The day-night line is where $\\tan\\varphi = -\\cos(\\lambda - \\lambda_s) / \\tan\\varphi_s$.'], eq: '\\sin h = \\sin\\varphi \\sin\\varphi_s + \\cos\\varphi \\cos\\varphi_s \\cos(\\lambda - \\lambda_s)' },
      { h: 'Landing criteria', p: ['Artemis III requires the surface to be lit for the stay [2]; Apollo landed with the Sun 7° to 20° above the horizon behind the lander [3], that is just inside the lit side near the line.'] },
      { h: 'Limitations', p: ['Terrain is ignored: near the poles a place on the lit side can still be in the shadow of a ridge. The Sun results of a clicked place include the terrain.'] },
    ],
    refs: ['de440', 'nasaReq', 'apollo1968'], seeAlso: ['sunlight', 'sun-position'],
  },
  'layer-score': {
    title: 'Score for your settings', category: 'Map layers',
    summary: 'The navigator score computed by the analysis server over the whole Moon for your landing time, stay and weights, plus a finer map around the south pole.',
    sections: [
      { h: 'Formula', p: ['The same score as for a clicked place: the weighted mean of the sub-scores $s_i$ (sunlight, longest night, Earth in view, longest blackout, slope) with your weights $w_i$ [1]:'], eq: 'S = \\frac{\\sum_i w_i\\, s_i}{\\sum_i w_i}' },
      { h: 'How the map is made', table: { head: ['Part', 'Request', 'Horizon'], rows: [
        ['Whole Moon', '/api/grid: the centre of every 4° cell', 'smooth sphere (no hills), LOLA slope'],
        ['South pole to 80° S', '/api/area: a point every 15 km', 'real LOLA terrain skyline'],
      ] } },
      { h: 'Colour scale', p: ['Stretched between the lowest and the highest score found, $c = (S - S_{\\min}) / (S_{\\max} - S_{\\min})$; the two values are printed under the bar.'] },
      { h: 'Landing criteria', p: ['The score ranks places; it does not certify them. Requirements (limits) are checked for a clicked place; the criteria with their sources are listed under "Landing criteria".'] },
      { h: 'Limitations', p: ['On the whole-Moon part hills are ignored (a terrain skyline costs about 0.3 s per point, hours for a grid); click a place for its full evaluation.'] },
    ],
    refs: ['parameters', 'api'], seeAlso: ['score', 'landing-criteria'],
  },
  views: {
    title: 'Views: 3D globe and 2D map', category: 'Methods',
    summary: 'What the two views draw and how: imagery, relief, lighting, the Sun and the Earth, and the map projection.',
    sections: [
      { h: '3D globe', p: [
        'Moon colour and relief: NASA CGI Moon Kit [1]; south pole: LROC WAC mosaic and LOLA 80 m altitude [2]. Relief exaggerated four times for readability.',
        'Lighting: a directional light from the sub-solar point at the landing time (JPL DE440 ephemeris) [3].',
        'Sun and Earth: real direction, size and distance at the landing time (to scale). Each sphere sits at distance $d$ in the direction of its sub-point, with radius $R_\\odot = 695\\,700$ km or $R_\\oplus = 6378$ km, so its apparent radius is the real one:',
      ], eq: '\\rho = \\arcsin\\!\\left(\\frac{R}{d}\\right)' },
      { h: '2D map', p: ['Simple cylindrical projection: $x = \\lambda$, $y = \\varphi$ (degrees). Areas stretch toward the poles, so a polar layer is drawn as a strip from 80° S to the pole at the bottom; zoom into it or use the globe.'] },
      { h: 'Stars', p: ['Decorative, not a star catalogue.'] },
    ],
    refs: ['svsMoon', 'pgda90', 'de440'], seeAlso: ['site-colours', 'layer-daynight'],
  },
  labels: {
    title: 'Labels: names of features', category: 'Map layers',
    summary: 'The "Labels" switch under the view writes the official names of craters, maria, mountains, valleys and other features on the globe and on the 2D map.',
    sections: [
      { h: 'Source', p: [
        'Names and centre coordinates from the Gazetteer of Planetary Nomenclature, kept by the International Astronomical Union (IAU) and the USGS Astrogeology Science Center [1]. Only names adopted by the IAU are shown, 2 023 of them. The lettered satellite craters (for example "Aristarchus A", 7 064 names) are left out so the map stays readable. The gazetteer gives coordinates on the IAU Moon 2000 sphere (radius 1737.4 km), planetocentric latitude and east longitude, the same convention as the rest of the navigator.',
        'Converted by frontend/scripts/nomenclature.py [2]. Display only: no computation uses the names.',
      ] },
      { h: 'Which names are shown', p: [
        'A name appears once its feature measures at least 28 pixels across on the screen, using the diameter in the gazetteer. Zooming in brings in smaller features. Names are placed largest feature first, and a name that would overlap one already placed is left out; at most 70 names are shown at a time. On the globe, names on the far side or within about 8° of the visible edge are hidden. The text keeps the same size on screen at any zoom.',
        'Maria, oceanus, lacus, sinus and palus names are written in italics, as on lunar maps.',
        'Features with no diameter in the gazetteer (for example Statio Shiv Shakti, the Chandrayaan-3 landing site) are treated as 5 km across, so they appear when zoomed in close. 28 px, 70 names and 5 km are display choices, not published values.',
      ] },
      { h: 'Limitations', p: [
        'A name is placed at the feature\'s centre point only; long features (valleys, rilles, mountain ranges) are not drawn along their length.',
        'On the globe the relief is exaggerated four times while the names sit on the 1737.4 km sphere, so near the visible edge a name can look slightly off its feature.',
      ] },
    ],
    refs: ['gazetteer', 'layersCode'], seeAlso: ['views', 'coordinates'],
  },
  'site-colours': {
    title: 'Site colours', category: 'Methods',
    summary: 'How the known sites, the calendar strip and the time strip are coloured.',
    sections: [
      { h: 'Formula', p: ['For the chosen quantity, each value is first turned into a "goodness" $g$ from 0 to 1 (hours are divided by the stay length, and quantities where less is better are reversed). The colours of one set (all sites on one date, or all days of the strip) are then stretched between the worst and the best of the set:'], eq: 'c = \\frac{g - g_{\\min}}{g_{\\max} - g_{\\min}}' },
      { h: 'Reading', p: ['The values at the two ends of the bar are the worst and the best site of that date. The palette never changes; only its ends move with the date and the settings. Equal colours on two dates do not mean equal values.'] },
    ],
    refs: ['parameters'], seeAlso: ['score', 'views'],
  },
  'landing-criteria': {
    title: 'Landing criteria', category: 'Methods',
    summary: 'Published criteria for choosing a landing site, with their source, and how the navigator relates to each. A criterion without a published number is listed as such.',
    sections: [
      { h: 'Criteria with a published value', table: {
        head: ['Criterion', 'Value', 'Source', 'In the navigator'],
        rows: [
          ['General slope of the landing area', 'below 2°', 'Apollo [1]', 'Slope layer; "Max landing slope"'],
          ['Landing slope', 'below 10° over 100 m', 'Artemis III [2]', 'Crewed preset; slope at 80 m'],
          ['Slope for EVA', 'below 20° over 2 km', 'Artemis III [2]', 'Slope layer (not checked automatically)'],
          ['Terrain slope at touchdown', 'below 10°', 'Nova-C [3]', 'Slope (coarser baseline)'],
          ['Hazards at touchdown', 'none larger than 30 cm', 'Nova-C [3]', 'Below map resolution; rock abundance counts rocks above about 1 m'],
          ['Sun during the approach', '7° to 20° behind the lander', 'Apollo [1]', 'Sun elevation at landing'],
          ['Approach lighting', 'beneficial', 'Artemis III [2]', 'Sun elevation at landing'],
          ['Location', 'within 6° of the south pole', 'Artemis III [2]', 'Choose the place'],
          ['Communication', 'direct with Earth, no relay; areas with Earth visibility below 25 % excluded', 'Artemis III [2]', 'Earth in view; crewed preset 25 %; Earth visibility layer'],
          ['Surface lighting', 'lit for the whole stay; areas with solar visibility below 5 % excluded', 'Artemis III [2]', 'Longest night; crewed preset 0 h; Sun visibility and shadow layers'],
          ['Landing accuracy', 'within 100 m of the target', 'Artemis III [2]', 'Landing accuracy of the uncertainty (default 100 m)'],
          ['Approach path', 'no large hills, tall cliffs or deep craters', 'Apollo [1]', 'Altitude and slope layers (qualitative)'],
          ['Smoothness', 'relatively few craters', 'Apollo [1]', 'Altitude, slope, rock abundance (qualitative)'],
        ],
      } },
      { h: 'No published value found', p: ['Rock abundance, surface temperature and H-parameter: no numeric landing limit was found in the sources above. The navigator shows them for context and does not score them. Thermal limits depend on each lander and crew system.'] },
      { h: 'How to use them', p: ['Set the limits under "Minimum requirements" (or choose the crewed preset) to check them for a clicked place; the layers show where they can be met. A criterion stated over a baseline (100 m, 2 km) should be compared with a slope measured over a similar distance.'] },
    ],
    refs: ['apollo1968', 'nasaReq', 'novaC'], seeAlso: ['requirements', 'mission-type', 'slope'],
  },
  animation: {
    title: 'Time animation', category: 'Mission setup',
    summary: 'Plays the time forward: at every tick the time moves on by one time step. Used for the landing time (Mission setup) and for the clock of the surface view.',
    sections: [
      { h: 'Controls', p: [
        'Speed: ticks per second, 1 to 30. Time step: how much mission time each tick adds, in minutes (presets from 1 min to 1 day). Mission time per second of animation:',
      ], eq: '\\dot t = n_{\\text{ticks/s}} \\times \\Delta t' },
      { h: 'Mission setup', p: [
        'Moves the landing time of the whole navigator: the time of day, rolling into the next days of the date strip. Past the last day of the strip the strip moves on to the next 30 days (the calendar and the date slider follow), so the animation keeps going until the last day the ephemeris covers (30 Sep 2149). The lighting of the globe, the results and the strips follow. Every new landing time is a new request to the analysis server, so a short step at high speed can run ahead of the answers; the results then show the newest time the server has finished.',
        'Without the analysis server only whole days exist (the precomputed files are at 00:00 UTC), so the step is at least one day, and the animation stops at the last precomputed day.',
      ] },
      { h: 'Surface view', p: ['Moves the clock of the surface view only, within its 30-day window; the landing time of the navigator does not change. Positions between two computed samples (every 10 min) are interpolated linearly for display.'] },
      { h: 'Limitations', p: ['The tick rate is the browser timer: a busy computer can tick slower than asked. Nothing computed depends on it.'] },
    ],
    refs: ['api'], seeAlso: ['landing-time', 'surface-view'],
  },
  'surface-view': {
    title: 'Surface view', category: 'Methods',
    summary: 'The sky and the terrain as seen by an observer standing at the chosen place, like a street-level view: turn and tilt the view, and watch the Sun and the Earth rise and set over the real skyline.',
    sections: [
      { h: 'What is computed and what is drawn', table: {
        head: ['Element', 'Source', 'Real or display only'],
        rows: [
          ['Sun and Earth direction (azimuth, elevation)', 'Analysis server, /api/ephemeris, JPL DE440 via SPICE [1][2], every 10 min for 30 days from 00:00 UTC of the landing day', 'Real; linear interpolation between samples'],
          ['Sun and Earth size', 'Angular radius from the server (real distance)', 'Real'],
          ['Earth phase (lit part)', 'Drawn from the Sun direction; the lit fraction printed is the server value', 'Real direction; the Earth texture does not rotate'],
          ['Skyline', 'Analysis server, /api/horizon: LOLA terrain ray-marched to 200 km, 720 azimuths, at the observer height of Mission setup [3]', 'Real'],
          ['"In view", rises and sets', 'Visible part of the disc from the server; in view = at least half of the disc above the skyline', 'Real'],
          ['Ground texture', 'Procedural regolith (scripts/regolith_texture.py)', 'Display only, not this place'],
          ['Stars', 'Random points', 'Display only, not a catalogue'],
          ['Brightness of the ground', 'Directional light from the Sun, scaled by the visible part of the solar disc, plus a weak earthshine from the Earth, scaled by its lit fraction, and a faint light everywhere so the ground stays visible at night', 'Display only'],
        ],
      } },
      { h: 'Geometry', p: [
        'Azimuth $A$ is measured clockwise from north, elevation $h$ up from the local horizontal plane. In the scene ($x$ east, $y$ up, $z$ south) a direction is:',
      ], eq: '\\hat d = (\\cos h \\sin A,\\ \\sin h,\\ -\\cos h \\cos A)' },
      { h: 'Scale', p: [
        'Only directions and angular sizes are real. The skyline is drawn as a wall at a fixed distance, raised to the skyline elevation of every azimuth; the Sun and the Earth are drawn beyond it with a radius $r = D \\tan\\rho$, so their apparent radius $\\rho$ is the real one. A body below the skyline is hidden by the wall, as it is from the place.',
      ] },
      { h: 'The two plots', p: ['Elevation of the Sun and of the Earth over the 30 days, with the skyline elevation in the body\'s direction (dashed). Shaded: the periods in view. Where the solid line crosses the dashed one the body rises or sets behind the terrain. Click a plot to move the clock there.'] },
      { h: 'Limitations', p: [
        'Needs the analysis server. The skyline is the one of the place itself; nearby boulders and small craters below the map resolution are not in it.',
        'The skyline is taken as flat across the width of the Sun\'s and the Earth\'s disc.',
      ] },
    ],
    refs: ['de440', 'spice', 'pgda90', 'api'], seeAlso: ['terrain-horizon', 'sun-position', 'earth-position', 'countdowns', 'animation'],
  },
} satisfies Record<string, TopicDef>

export type TopicId = keyof typeof DEFS
export const TOPICS: Record<TopicId, TopicDef> = DEFS
export const CATEGORIES: Category[] = ['Mission setup', 'Results', 'Map layers', 'Methods']

// Which topic documents each API field shown in the panes.
export const FIELD_TOPIC: Record<string, TopicId> = {
  score: 'score',
  both_frac: 'both-in-view',
  sunlit_frac: 'sunlight',
  earth_visible_frac: 'earth-in-view',
  longest_dark_h: 'longest-night',
  longest_no_earth_h: 'longest-blackout',
  slope_deg: 'slope',
  elevation_m: 'elevation',
  rock_abundance_frac: 'rock-abundance',
  h_parameter_m: 'h-parameter',
  surface_temp_max_k: 'surface-temperature',
  surface_temp_avg_k: 'surface-temperature',
}
