"""Terrain checks. The ray-marching maths is tested on synthetic terrain (always runs); the tests on the real
LOLA maps are skipped when the maps are not on disk (python -m analysis.download_maps)."""
import numpy as np
import pytest
from fastapi.testclient import TestClient

from analysis import ephemeris as eph, horizon, metrics, terrain
from analysis.api import app
from analysis.metrics import Inputs
from analysis.tests.test_api import assert_valid

needs_maps = pytest.mark.skipif(not terrain.available(), reason="LOLA maps not on disk")
needs_5m = pytest.mark.skipif(not (terrain.available() and terrain.has("dem_87s_5m")), reason="5 m map not on disk")
needs_slope_map = pytest.mark.skipif(not (terrain.available() and terrain.has("slope_80s_80m")), reason="slope map not on disk")
client = TestClient(app)
SITE_P = terrain.unit_vectors(-89.5, -135.0)
AZ = np.arange(0.0, 360.0, 30.0)
DIST = np.array([10.0, 100.0, 1_000.0, 10_000.0, 100_000.0])


# ---------------------------------------------------------------- synthetic terrain (no maps needed)

@pytest.mark.parametrize("h_obs", [0.5, 2.0, 10.0, 100.0])
def test_flat_terrain_gives_the_smooth_sphere_dip(h_obs):
    flat = lambda pts, dist: np.zeros(pts.shape[:-1])
    dist = terrain._ray_distances(80.0, 80.0, 0.005, 200_000.0, 10_000.0)
    el = terrain.march(SITE_P, 0.0, h_obs, AZ, dist, flat)
    assert el == pytest.approx(-horizon.dip_deg(h_obs), abs=2e-3)


def test_a_wall_gives_the_expected_angle():
    # A 500 m high plateau starting 10 km away, all around: the skyline is its near edge.
    wall = lambda pts, dist: np.broadcast_to(np.where(dist >= 10_000.0, 500.0, 0.0), pts.shape[:-1])
    el = terrain.march(SITE_P, 0.0, 2.0, AZ, DIST, wall)
    theta, r = 10_000.0 / terrain.R_M, terrain.R_M
    expected = np.degrees(np.arctan2((r + 500.0) * np.cos(theta) - (r + 2.0), (r + 500.0) * np.sin(theta)))
    assert el == pytest.approx(expected, abs=1e-9) and 2.6 < expected < 2.9   # ~atan(498 / 10000) minus curvature


def test_site_on_a_hill_sees_below_the_horizontal():
    hill = lambda pts, dist: np.zeros(pts.shape[:-1])           # surroundings at 0, site at +1000 m
    el = terrain.march(SITE_P, 1000.0, 2.0, AZ, DIST, hill)
    assert (el < -1.5).all()


def test_ray_distances_are_increasing_and_bounded():
    s = terrain._ray_distances(5.0, 80.0, 0.005, 200_000.0, 10_000.0)
    assert s[0] == 5.0 and s[-1] < 200_000.0 and (np.diff(s) > 0).all()
    assert np.diff(s)[s[:-1] > 20_000.0].min() >= 80.0          # far field never steps finer than the 80 m map


def test_bilinear_interpolation_and_column_wrap():
    a = np.array([[0.0, 10.0, 20.0], [100.0, 110.0, 120.0]])
    assert terrain._bilinear(a, np.array([1.0]), np.array([1.0]))[0] == pytest.approx(55.0)    # middle of 4 pixels
    assert terrain._bilinear(a, np.array([0.5]), np.array([1.5]))[0] == pytest.approx(10.0)    # a pixel centre
    assert terrain._bilinear(a, np.array([0.5]), np.array([3.0]), wrap_cols=True)[0] == pytest.approx(10.0)  # between col 2 and col 0


def test_smooth_sphere_when_terrain_is_switched_off():
    az = np.zeros((1, 3))
    assert horizon.horizon_deg(-89.5, -135.0, az, 2.0, use_terrain=False) == pytest.approx(-horizon.dip_deg(2.0))
    assert horizon.source(False) == horizon.SMOOTH


# ---------------------------------------------------------------- real LOLA maps

@needs_maps
def test_elevation_values_and_agreement_between_maps():
    e = terrain.elevation_m([-89.5, -88.0, -84.0, -65.0], [-135.0, 60.0, 100.0, 140.0])
    assert e == pytest.approx([1759.0, -3451.0, -1858.0, -3300.0], abs=15.0)   # values read from the maps on 2026-11-14
    # The same point from the polar 240 m map and from the global map must agree (different products, same Moon).
    p = terrain.unit_vectors(np.array([-75.0]), np.array([-30.0]))
    m = terrain._maps()
    x, y = terrain.PolarMap.xy(p)
    assert m["240"].sample(x, y)[0] == pytest.approx(m["global"].sample(p)[0], abs=60.0)


@needs_maps
def test_global_map_seam_at_longitude_zero():
    e = terrain.elevation_m([0.0, 0.0, 0.0, 0.0], [0.0, 0.002, -0.002, 359.998])
    assert np.isfinite(e).all() and np.ptp(e) < 30.0            # continuous across 0 / 360 deg


@needs_slope_map
def test_slope_from_the_dem_reproduces_the_official_slope_map():
    rng = np.random.default_rng(1)
    lat, lon = -90.0 + rng.uniform(0.3, 9.0, 400), rng.uniform(-180.0, 180.0, 400)
    official = terrain._sample_aux("slope_80s_80m", lat, lon)
    p = terrain.unit_vectors(lat, lon)
    x, y = terrain.PolarMap.xy(p)
    ours = terrain._slope_polar(terrain._maps()["80"], x, y, p)
    assert np.median(np.abs(ours - official)) < 0.5 and np.corrcoef(ours, official)[0, 1] > 0.98


@needs_maps
def test_slope_sources_and_baselines():
    value, baseline, source = terrain.slope_deg([-75.0, 0.0, 45.0], [-30.0, 0.0, -60.0])
    assert list(baseline) == pytest.approx([240.0, 236.9, 236.9], abs=0.1)
    assert all(s.startswith("computed from") for s in source) and ((value >= 0) & (value < 60)).all()


@needs_5m
def test_fast_horizon_skips_the_5m_map_but_stays_close():
    """Area searches use the coarse profile without the 5 m map (performance); it must stay close to the fine one."""
    fine, fast = terrain.horizon(-89.5, -135.0, 2.0), terrain.horizon(-89.5, -135.0, 2.0, fast=True)
    assert fine.layers[0]["resolution_m"] == 5.0 and fast.layers[0]["resolution_m"] == 80.0
    diff = np.abs(terrain.horizon_at(fine, fast.az_deg) - fast.elev_deg)
    assert np.median(diff) < 0.3 and diff.max() < 2.0


@needs_maps
def test_fast_horizon_is_close_to_the_fine_one():
    fine, fast = terrain.horizon(-84.0, 100.0, 2.0), terrain.horizon(-84.0, 100.0, 2.0, fast=True)
    assert len(fine.az_deg) == 720 and len(fast.az_deg) == 180
    assert np.abs(terrain.horizon_at(fine, fast.az_deg) - fast.elev_deg).max() < 0.3


@needs_5m
def test_crater_floor_in_permanent_shadow_is_never_sunlit():
    """88 S 60 E is a crater floor 3.4 km deep; the LOLA long-term Sun visibility map gives 0 there."""
    bv = eph.body_vectors("2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z", 3600)
    with_terrain = metrics.site_series(bv, -88.0, 60.0, Inputs())
    smooth = metrics.site_series(bv, -88.0, 60.0, Inputs(use_terrain=False))
    assert not with_terrain["lit"].any() and smooth["lit"].any()
    assert terrain.lola_mean_visibility(-88.0, 60.0)[0][0] == 0.0


@needs_maps
def test_api_horizon_matches_contract():
    r = client.get("/api/horizon", params={"lat_deg": -84.0, "lon_deg": 100.0})
    assert r.status_code == 200, r.text
    doc = r.json()
    assert_valid(doc, "horizon.schema.json")
    assert len(doc["azimuth_deg"]) == 720 == len(doc["horizon_elev_deg"]) and doc["dem"]["max_range_km"] == 200.0


@needs_slope_map
def test_api_evaluate_with_terrain_and_slope_requirement():
    site = {"lat_deg": -89.5, "lon_deg": -135.0, "start_utc": "2026-11-15T00:00:00Z"}
    doc = client.get("/api/evaluate", params={**site, "max_slope_deg": 8}).json()
    assert doc["horizon_source"] == "lola-terrain" and doc["terrain"]["used"] is True
    assert doc["parameters"]["slope_deg"]["value"] == pytest.approx(13.1, abs=0.3)      # official map value
    assert doc["terrain"]["slope_baseline_m"] == 80.0
    assert doc["parameters"]["elevation_m"]["value"] == pytest.approx(1759.0, abs=15.0)
    assert doc["requirements_violated"] == 1 and doc["violations"][0]["limit"] == "max_slope_deg"
    assert doc["score"]["components"]["slope_deg"]["score"] is not None
    ok = client.get("/api/evaluate", params={**site, "max_slope_deg": 20}).json()
    assert ok["requirements_violated"] == 0 and ok["feasible"] is True


@needs_maps
def test_api_area_scores_vary_with_terrain():
    doc = client.get("/api/area", params={"lat_deg": -84.0, "lon_deg": 100.0, "start_utc": "2026-11-15T00:00:00Z",
                                          "radius_km": 5, "spacing_km": 1}).json()
    lo, hi = doc["score_range"]
    assert hi - lo > 0.02 and doc["terrain"]["used"] is True
    assert None not in doc["points"]["parameters"]["slope_deg"]
