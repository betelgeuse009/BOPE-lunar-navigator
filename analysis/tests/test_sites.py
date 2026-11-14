"""Site catalogue checks."""
import json

import pytest

from analysis import config, sites, terrain
from analysis.tests.test_api import assert_valid

needs_maps = pytest.mark.skipif(not terrain.available(), reason="LOLA maps not on disk")

# Elevations stated by the coordinate sources themselves (LROC pages, read 2026-11-14), metres above the 1737.4 km sphere.
SOURCE_ELEVATION_M = {"change-5": -2570, "change-6": -5256, "chandrayaan-3": 532, "slim": -912,
                      "im-1-odysseus": 2579, "blue-ghost-1": -3650, "hakuto-r-m2": -2431.6}


def test_catalogue_entries_are_complete_and_cited():
    ids = [s["id"] for s in sites.CATALOG]
    assert len(ids) == len(set(ids)) >= 30
    for s in sites.CATALOG:
        assert -90 <= s["lat_deg"] <= 90 and -180 <= s["lon_deg"] <= 180, s["id"]
        assert s["coord_source"] and s["coord_source_url"].startswith("https://"), s["id"]
        assert s["coord_kind"] in ("landed", "impact", "target", "region-centre"), s["id"]
        assert (s["status"] == "planned") == (s["coord_kind"] in ("target", "region-centre")), s["id"]
    cats = {s["category"] for s in sites.CATALOG}
    assert {"apollo", "clps", "international", "commercial"} <= cats


def test_static_sites_file_matches_contract_and_catalogue():
    path = config.REPO / "data" / "processed" / "sites.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    assert_valid(doc, "sites.schema.json")
    assert [s["id"] for s in doc["sites"]] == [s["id"] for s in sites.CATALOG]


@needs_maps
@pytest.mark.parametrize("site_id,expected", sorted(SOURCE_ELEVATION_M.items()))
def test_lola_elevation_at_cited_coordinates_matches_the_source(site_id, expected):
    """Independent check of coordinates, longitude convention and map reading: our LOLA height at the cited point
    must match the elevation the same source states (within 40 m; the 237 m global map is coarse)."""
    s = sites.get(site_id)
    assert terrain.elevation_m(s["lat_deg"], s["lon_deg"])[0] == pytest.approx(expected, abs=40.0)
