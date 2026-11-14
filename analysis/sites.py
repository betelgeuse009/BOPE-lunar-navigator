"""Site catalogue: known landing sites with a cited source for every coordinate (task T05). List and sources: data/SITES.md.

Coordinates are planetocentric latitude and east longitude (-180..180) in the Mean Earth / Polar Axis frame.
Every entry states where its coordinates come from (`coord_source`, `coord_source_url`) and what they mark
(`coord_kind`: landed position, impact point of a failed landing, or the centre of a named target region).
Nothing is filled in from memory: missions without published coordinates are left out (see data/SITES.md).

EXAMPLES are the three development points used for data/samples/ (not landing sites).
"""
from __future__ import annotations

# ---------------------------------------------------------------- sources (read 2026-11-14)
NSSDCA_APOLLO = ("NASA NSSDCA, Apollo Landing Site Coordinates (Lunar Module positions measured on LRO images, "
                 "Wagner et al. 2017, Icarus 283, 92-103); Mean Earth/Polar Axis, DE421; page updated 2017-03-06")
NSSDCA_APOLLO_URL = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html"
NSSDCA_LANDINGS = ("NASA NSSDCA, Lunar impact and landing sites table; DE421 Mean Earth/polar axis frame; "
                   "page updated 2025-08-13")
NSSDCA_LANDINGS_URL = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html"
LROC = "https://lroc.im-ldi.com/images/"


def _lroc(image: str, what: str) -> str:
    return f"LROC (Arizona State University) image {image}: {what}; same position in the NSSDCA landing sites table"


def _site(id_, name, lat, lon, category, date, agency, country, status, kind, source, url, description, accuracy=None,
          region=False):
    s = {"id": id_, "name": name, "lat_deg": lat, "lon_deg": lon, "category": category, "coord_source": source,
         "coord_source_url": url, "coord_kind": kind, "status": status, "agency": agency, "country": country,
         "description": description, "is_region": region}
    if date:
        s["mission_date"] = date
    if accuracy is not None:
        s["coord_accuracy_m"] = accuracy
    return s


CATALOG = [
    # ---- Apollo crewed landings: Lunar Module positions
    _site("apollo-11", "Apollo 11 (Tranquility Base)", 0.67416, 23.47314, "apollo", "1969-07-20", "NASA", "USA",
          "landed", "landed", NSSDCA_APOLLO, NSSDCA_APOLLO_URL, "First crewed landing, Mare Tranquillitatis."),
    _site("apollo-12", "Apollo 12", -3.0128, -23.4219, "apollo", "1969-11-19", "NASA", "USA",
          "landed", "landed", NSSDCA_APOLLO, NSSDCA_APOLLO_URL, "Oceanus Procellarum, next to Surveyor 3."),
    _site("apollo-14", "Apollo 14 (Fra Mauro)", -3.64589, -17.47194, "apollo", "1971-02-05", "NASA", "USA",
          "landed", "landed", NSSDCA_APOLLO, NSSDCA_APOLLO_URL, "Fra Mauro highlands."),
    _site("apollo-15", "Apollo 15 (Hadley-Apennine)", 26.13239, 3.63330, "apollo", "1971-07-30", "NASA", "USA",
          "landed", "landed", NSSDCA_APOLLO, NSSDCA_APOLLO_URL, "Hadley Rille at the foot of the Apennine mountains."),
    _site("apollo-16", "Apollo 16 (Descartes)", -8.9734, 15.5011, "apollo", "1972-04-21", "NASA", "USA",
          "landed", "landed", NSSDCA_APOLLO, NSSDCA_APOLLO_URL, "Descartes highlands, the only Apollo highland site."),
    _site("apollo-17", "Apollo 17 (Taurus-Littrow)", 20.1911, 30.7723, "apollo", "1972-12-11", "NASA", "USA",
          "landed", "landed", NSSDCA_APOLLO, NSSDCA_APOLLO_URL, "Taurus-Littrow valley, last crewed landing."),

    # ---- NASA Surveyor robotic landers
    _site("surveyor-1", "Surveyor 1", -2.4745, -43.3398, "other", "1966-06-02", "NASA", "USA", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "First US soft landing, Oceanus Procellarum."),
    _site("surveyor-3", "Surveyor 3", -3.0162, -23.4180, "other", "1967-04-20", "NASA", "USA", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Visited by the Apollo 12 crew."),
    _site("surveyor-5", "Surveyor 5", 1.4551, 23.1943, "other", "1967-09-11", "NASA", "USA", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Mare Tranquillitatis."),
    _site("surveyor-6", "Surveyor 6", 0.4742, -1.4275, "other", "1967-11-10", "NASA", "USA", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Sinus Medii; first lift-off from the Moon (a short hop)."),
    _site("surveyor-7", "Surveyor 7", -40.9812, -11.5127, "other", "1968-01-10", "NASA", "USA", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Highlands north of Tycho crater."),

    # ---- Soviet Luna landers
    _site("luna-9", "Luna 9", 7.13, -64.37, "international", "1966-02-03", "USSR", "USSR", "landed", "landed",
          NSSDCA_LANDINGS + " (NSSDCA note: from a Pravda report, not confirmed)", NSSDCA_LANDINGS_URL,
          "First soft landing on the Moon. Position not confirmed."),
    _site("luna-13", "Luna 13", 18.87, -62.05, "international", "1966-12-24", "USSR", "USSR", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Oceanus Procellarum."),
    _site("luna-16", "Luna 16", -0.5137, 56.3638, "international", "1970-09-20", "USSR", "USSR", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "First robotic sample return, Mare Fecunditatis."),
    _site("luna-17", "Luna 17 (Lunokhod 1)", 38.23764, -35.00163, "international", "1970-11-17", "USSR", "USSR",
          "landed", "landed", NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Delivered Lunokhod 1, the first lunar rover."),
    _site("luna-20", "Luna 20", 3.7863, 56.6242, "international", "1972-02-21", "USSR", "USSR", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Sample return from the highlands near Mare Fecunditatis."),
    _site("luna-21", "Luna 21 (Lunokhod 2)", 25.9994, 30.4076, "international", "1973-01-15", "USSR", "USSR",
          "landed", "landed", NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Delivered Lunokhod 2, Le Monnier crater."),
    _site("luna-23", "Luna 23", 12.6667, 62.1511, "international", "1974-11-06", "USSR", "USSR", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Mare Crisium; damaged on landing, no sample returned."),
    _site("luna-24", "Luna 24", 12.7142, 62.2129, "international", "1976-08-18", "USSR", "USSR", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Sample return from Mare Crisium."),

    # ---- China, India, Japan
    _site("change-3", "Chang'e 3", 44.1214, -19.5117, "international", "2013-12-14", "CNSA", "China", "landed", "landed",
          NSSDCA_LANDINGS, NSSDCA_LANDINGS_URL, "Mare Imbrium, with the Yutu rover."),
    _site("change-4", "Chang'e 4", -45.4561, 177.5885, "international", "2019-01-03", "CNSA", "China", "landed", "landed",
          "LROC (Arizona State University), Chang'e 4 lander coordinates; same position in the NSSDCA landing sites table",
          "https://lroc.im-ldi.com/posts/1087", "First far-side landing, Von Karman crater.", accuracy=20),
    _site("change-5", "Chang'e 5", 43.0576, -51.9161, "international", "2020-12-01", "CNSA", "China", "landed", "landed",
          _lroc("1172", "43.0576 N, 308.0839 E, -2570 m"), LROC + "1172", "Sample return, Oceanus Procellarum.",
          accuracy=20),
    _site("change-6", "Chang'e 6", -41.6385, -153.9852, "international", "2024-06-01", "CNSA", "China", "landed", "landed",
          _lroc("1374", "41.6385 S, 206.0148 E, -5256 m"), LROC + "1374", "First far-side sample return, Apollo basin.",
          accuracy=30),
    _site("chandrayaan-3", "Chandrayaan-3 (Vikram)", -69.3741, 32.32, "international", "2023-08-23", "ISRO", "India",
          "landed", "landed", _lroc("1314", "69.3741 S, 32.32 E, 532 m"), LROC + "1314",
          "Southernmost landing before 2024; about 600 km from the south pole."),
    _site("slim", "SLIM", -13.3160, 25.2510, "international", "2024-01-19", "JAXA", "Japan", "landed", "landed",
          _lroc("1358", "13.3160 S, 25.2510 E, -912 m"), LROC + "1358",
          "Precision landing near Shioli crater; came to rest upside down."),

    # ---- NASA CLPS (commercial landers carrying NASA payloads)
    _site("im-1-odysseus", "IM-1 Odysseus (Intuitive Machines)", -80.13, 1.44, "clps", "2024-02-22",
          "Intuitive Machines / NASA CLPS", "USA", "landed", "landed", _lroc("1360", "80.13 S, 1.44 E, 2579 m"),
          LROC + "1360", "First commercial landing, near Malapert A; tipped over on touchdown."),
    _site("im-2-athena", "IM-2 Athena (Intuitive Machines)", -84.7906, 29.1957, "clps", "2025-03-06",
          "Intuitive Machines / NASA CLPS", "USA", "landed", "landed",
          _lroc("1408", "84.7906 S, 29.1957 E; intended site 84.78 S, 29.13 E (image 1401)"), LROC + "1408",
          "Mons Mouton; came to rest on its side in a small crater."),
    _site("blue-ghost-1", "Blue Ghost Mission 1 (Firefly)", 18.5623, 61.8103, "clps", "2025-03-02",
          "Firefly Aerospace / NASA CLPS", "USA", "landed", "landed", _lroc("1407", "18.5623 N, 61.8103 E, -3650 m"),
          LROC + "1407", "Mons Latreille, Mare Crisium; first fully successful commercial landing."),
    _site("im-3-reiner-gamma", "IM-3 target: Reiner Gamma (Intuitive Machines)", 7.39, -58.96, "clps", None,
          "Intuitive Machines / NASA CLPS", "USA", "planned", "region-centre",
          "Target named in the NASA CLPS AGU 2025 poster (Haviland et al., NTRS 20250011367); coordinates = IAU centre "
          "of the Reiner Gamma swirl (USGS Gazetteer of Planetary Nomenclature, feature 4987, LOLA 2011 control net)",
          "https://planetarynames.wr.usgs.gov/Feature/4987",
          "Planned landing at the Reiner Gamma swirl (73 km). The exact site is not published: marker = centre of the swirl.",
          region=True),

    # ---- Other commercial missions (failed landings: the marker is where the hardware is)
    _site("hakuto-r-m1", "HAKUTO-R Mission 1 (ispace)", 47.581, 44.094, "commercial", "2023-04-25", "ispace", "Japan",
          "crashed", "impact", _lroc("1302", "debris at 47.581 N, 44.094 E, near the nominal landing site"),
          LROC + "1302", "Landing attempt near Atlas crater ended in a crash."),
    _site("hakuto-r-m2", "HAKUTO-R Mission 2 Resilience (ispace)", 60.4445, -4.5880, "commercial", "2025-06-05",
          "ispace", "Japan", "crashed", "impact",
          _lroc("1456", "impact at 60.4445 N, 355.4120 E; planned landing area 60.5 N, 355.4 E (image 1412)"),
          LROC + "1456", "Landing attempt in Mare Frigoris ended in a hard landing."),
]

_EXAMPLE_SOURCE = "Development example point chosen by AERO; not a landing site"
EXAMPLES = [
    {"id": "example-south-pole", "name": "Example: south pole", "lat_deg": -89.5, "lon_deg": -135.0},
    {"id": "example-near-side", "name": "Example: near-side centre", "lat_deg": 0.0, "lon_deg": 0.0},
    {"id": "example-far-side", "name": "Example: far-side centre", "lat_deg": 0.0, "lon_deg": 180.0},
]
for _s in EXAMPLES:
    _s.update(category="other", coord_source=_EXAMPLE_SOURCE,
              description="Example point for front-end development only.")

SITES = CATALOG   # what /api/sites and data/processed/sites.json serve


def get(site_id: str) -> dict:
    for s in CATALOG + EXAMPLES:
        if s["id"] == site_id:
            return s
    raise ValueError(f"unknown site_id '{site_id}'. Known: {', '.join(s['id'] for s in CATALOG + EXAMPLES)}")
