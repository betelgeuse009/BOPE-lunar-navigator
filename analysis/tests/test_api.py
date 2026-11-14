"""API checks: every contract-shaped response must validate against contracts/schemas/."""
import json

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from analysis import config
from analysis.api import app

client = TestClient(app)
SCHEMAS = config.REPO / "contracts" / "schemas"
REGISTRY = Registry().with_resources(
    [(p.name, Resource.from_contents(json.loads(p.read_text(encoding="utf-8")))) for p in SCHEMAS.glob("*.schema.json")])
SITE = {"lat_deg": -89.5, "lon_deg": -135.0, "start_utc": "2026-11-15T00:00:00Z"}


def assert_valid(doc: dict, schema: str) -> None:
    v = Draft202012Validator(REGISTRY.get_or_retrieve(schema).value.contents, registry=REGISTRY, format_checker=FormatChecker())
    errors = [f"{'/'.join(map(str, e.absolute_path))}: {e.message}" for e in v.iter_errors(doc)]
    assert not errors, errors[:5]


def get(path: str, **params) -> dict:
    r = client.get(path, params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_health():
    assert get("/api/health")["status"] == "ok"


def test_sites_matches_contract():
    assert_valid(get("/api/sites"), "sites.schema.json")


def test_ephemeris_matches_contract():
    doc = get("/api/ephemeris", **SITE, mission_h=48)
    assert_valid(doc, "ephemeris.schema.json")
    assert len(doc["time_utc"]) == 48 * 6 == len(doc["sun_el_deg"]) == len(doc["earth_dir_enu"])


def test_ephemeris_by_site_id_and_0_360_longitude():
    a = get("/api/ephemeris", site_id="example-south-pole", start_utc=SITE["start_utc"], mission_h=6)
    b = get("/api/ephemeris", lat_deg=-89.5, lon_deg=225.0, start_utc=SITE["start_utc"], mission_h=6)
    assert a["sun_az_deg"] == b["sun_az_deg"]


def test_metrics_matches_contract():
    doc = get("/api/metrics", **SITE, mission_h=336, load_w=50)
    assert_valid(doc, "metrics.schema.json")
    assert doc["metrics"]["battery_needed_wh"]["value"] == pytest.approx(50 * doc["metrics"]["longest_dark_h"]["value"], abs=0.1)


def test_scene_matches_contract():
    assert_valid(get("/api/scene", start_utc=SITE["start_utc"], mission_h=24), "scene.schema.json")


def test_matrix_matches_contract():
    doc = get("/api/matrix", start_utc="2026-11-01T00:00:00Z", n_dates=5)
    assert_valid(doc, "matrix.schema.json")
    assert len(doc["cells"]["score"]) == 3 and len(doc["cells"]["score"][0]) == 5
    custom = get("/api/matrix", start_utc="2026-11-01T00:00:00Z", n_dates=2, points="-89.5,-135;0,0")
    assert custom["site_ids"] == ["point-1", "point-2"]


def test_evaluate_parameters_feasibility_and_score():
    doc = get("/api/evaluate", **SITE, load_w=100, panel_area_m2=2, panel_efficiency_frac=0.3, max_no_earth_h=1, max_slope_deg=8)
    p = doc["parameters"]
    assert 0 <= p["sunlit_frac"]["value"] <= 1 and p["slope_deg"]["value"] is None
    assert p["energy_margin_kwh"]["value"] is not None
    assert doc["feasible"] is False and doc["violations"][0]["limit"] == "max_no_earth_h"
    assert doc["not_checked"] == ["max_slope_deg"]
    assert 0 <= doc["score"]["value"] <= 1


def test_taller_mast_sees_at_least_as_much_sun():
    low = get("/api/evaluate", **SITE, obs_height_m=2)["parameters"]["sunlit_frac"]["value"]
    high = get("/api/evaluate", **SITE, obs_height_m=100)["parameters"]["sunlit_frac"]["value"]
    assert high >= low


def test_area_returns_grid_and_best_point():
    doc = get("/api/area", **SITE, radius_km=5, spacing_km=1)
    pts = doc["points"]
    n = len(pts["lat_deg"])
    assert n > 50 and all(len(pts[k]) == n for k in ("lon_deg", "east_km", "north_km", "score", "feasible"))
    assert pts["east_km"][0] == 0 and pts["north_km"][0] == 0            # index 0 is the clicked point
    assert doc["best"]["score"] >= doc["center_score"]
    assert doc["center_is_best"] == (doc["best"]["index"] == 0)


@pytest.mark.parametrize("path,params", [
    ("/api/ephemeris", {"start_utc": "2026-11-15T00:00:00Z"}),                                   # no site
    ("/api/ephemeris", {**SITE, "end_utc": "2026-11-01T00:00:00Z"}),                            # end before start
    ("/api/ephemeris", {"site_id": "nope", "start_utc": "2026-11-15T00:00:00Z"}),                # unknown site
    ("/api/area", {**SITE, "radius_km": 100, "spacing_km": 0.5}),                                # too many points
    ("/api/evaluate", {**SITE, "lat_deg": -95}),                                                 # latitude out of range
])
def test_bad_requests_get_422(path, params):
    assert client.get(path, params=params).status_code == 422


def test_horizon_not_implemented_yet():
    assert client.get("/api/horizon").status_code == 501
