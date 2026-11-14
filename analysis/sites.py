"""Site catalogue.

TODO (T05): replace the example points with the curated landing sites. A site only goes in with a citation
for its coordinates (`coord_source`). Until then the catalogue holds three example points that show three
regimes: Sun grazing the horizon (pole), Earth always high (near side), Earth never visible (far side).
"""
from __future__ import annotations

_EXAMPLE_SOURCE = "Development example point chosen by AERO; not a landing site"

SITES = [
    {"id": "example-south-pole", "name": "Example: south pole", "lat_deg": -89.5, "lon_deg": -135.0},
    {"id": "example-near-side", "name": "Example: near-side centre", "lat_deg": 0.0, "lon_deg": 0.0},
    {"id": "example-far-side", "name": "Example: far-side centre", "lat_deg": 0.0, "lon_deg": 180.0},
]
for _s in SITES:
    _s.update(category="other", coord_source=_EXAMPLE_SOURCE,
              description="Example point for front-end development only.")


def get(site_id: str) -> dict:
    for s in SITES:
        if s["id"] == site_id:
            return s
    raise ValueError(f"unknown site_id '{site_id}'. Known: {', '.join(s['id'] for s in SITES)}")
