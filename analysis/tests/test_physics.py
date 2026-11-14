"""Physics checks. Run from the repo root:  .venv/Scripts/python.exe -m pytest analysis"""
import numpy as np
import pytest

from analysis import ephemeris as eph, horizon, metrics, products, scoring, visibility as vis
from analysis.metrics import Inputs

START, END = "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"


@pytest.fixture(scope="module")
def bv():
    return eph.body_vectors(START, END, 3600)


@pytest.mark.parametrize("lat,lon", [(-89.5, -135.0), (0.0, 0.0), (0.0, 180.0), (-85.3, 31.2), (45.0, -60.0)])
@pytest.mark.parametrize("body", ["SUN", "EARTH"])
def test_vector_method_matches_spice_azlcpo(bv, lat, lon, body):
    """Our numpy projection and the SPICE routine azlcpo must agree far below the 0.01 deg tolerance."""
    ours = eph.topocentric(bv.sun_km if body == "SUN" else bv.earth_km, eph.site_positions_km(lat, lon, 2.0))
    ref = eph.topocentric_azlcpo(body, bv.times_utc, lat, lon, 2.0)
    d_az = np.abs((ours["az_deg"][0] - ref["az_deg"] + 180.0) % 360.0 - 180.0) * np.cos(np.radians(ref["el_deg"]))
    assert np.abs(ours["el_deg"][0] - ref["el_deg"]).max() < 1e-4
    assert d_az.max() < 1e-4
    assert np.abs(ours["dist_km"][0] - ref["dist_km"]).max() < 1.0


def test_sun_grazes_the_horizon_at_the_pole(bv):
    s = metrics.site_series(bv, -89.5, -135.0, Inputs())
    assert np.abs(s["sun_el_deg"]).max() < 3.0   # lunar obliquity to the ecliptic is ~1.5 deg


def test_earth_always_high_from_near_side_centre(bv):
    s = metrics.site_series(bv, 0.0, 0.0, Inputs())
    assert s["earth_el_deg"].min() > 75.0 and s["comm"].all()


def test_earth_never_visible_from_far_side_centre(bv):
    s = metrics.site_series(bv, 0.0, 180.0, Inputs())
    assert s["earth_el_deg"].max() < -75.0 and not s["comm"].any()


def test_sub_earth_point_stays_within_libration(bv):
    lat, lon = eph.sub_point_deg(bv.earth_km)
    assert np.abs(lat).max() < 8.0 and np.abs(lon).max() < 9.0


def test_visible_disk_fraction_limits():
    r = np.array([0.27])
    assert vis.visible_disk_frac(np.array([1.0]), r, 0.0)[0] == 1.0
    assert vis.visible_disk_frac(np.array([-1.0]), r, 0.0)[0] == 0.0
    assert vis.visible_disk_frac(np.array([0.0]), r, 0.0)[0] == pytest.approx(0.5)


def test_horizon_dip_grows_with_height():
    assert horizon.dip_deg(0.0) == 0.0
    assert horizon.dip_deg(2.0) == pytest.approx(0.0869, abs=1e-3)   # acos(R / (R + 2 m))
    assert horizon.dip_deg(10.0) > horizon.dip_deg(2.0)


def test_runs_and_longest_run():
    mask = np.array([True, True, False, True, True, True, False])
    assert vis.runs(mask) == [(0, 2), (3, 6)]
    assert vis.longest_run_h(mask, 3600) == 3.0
    assert vis.hours_to_first(~mask, 3600) == 2.0


def test_energy_balance_and_battery(bv):
    inp = Inputs(load_w=100.0, panel_area_m2=2.0, panel_efficiency_frac=0.3)
    p = metrics.summarize(metrics.site_series(bv, 0.0, 0.0, inp), 0, slice(None), 3600, inp)
    assert p["energy_required_kwh"] == pytest.approx(100.0 * p["window_h"] / 1000.0)
    assert p["battery_needed_wh"] == pytest.approx(100.0 * p["longest_dark_h"])
    assert p["energy_generated_kwh"] == pytest.approx(p["sun_energy_tracking_kwh_m2"] * 2.0 * 0.3)
    # Full sunlight near 1 AU is about 1361 W/m^2; the mean over day and night must be below that.
    assert 0 < p["mean_irradiance_w_m2"] < 1420


def test_score_and_feasibility():
    p = {"window_h": 100.0, "sunlit_frac": 0.8, "longest_dark_h": 20.0, "earth_visible_frac": 0.5,
         "longest_no_earth_h": 50.0, "slope_deg": None, "energy_margin_kwh": None}
    w = {"sunlit_frac": 1, "longest_dark_h": 1, "earth_visible_frac": 1, "longest_no_earth_h": 1, "slope_deg": 1}
    assert scoring.score(p, w)["value"] == pytest.approx((0.8 + 0.8 + 0.5 + 0.5) / 4)   # slope is left out
    f = scoring.feasibility(p, {"max_dark_h": 10.0, "min_sunlit_frac": 0.5, "max_slope_deg": 8.0})
    assert not f["feasible"] and f["violations"][0]["limit"] == "max_dark_h" and f["not_checked"] == ["max_slope_deg"]


def test_disc_grid_and_offsets():
    x, y = products.disc_grid(5.0, 1.0)
    assert (x[0], y[0]) == (0.0, 0.0) and np.hypot(x, y).max() <= 5.0 + 1e-9
    lat, lon = products.offsets_to_latlon(-89.5, -135.0, np.array([0.0, 0.0]), np.array([0.0, 1.0]))
    assert lat[0] == pytest.approx(-89.5) and lon[0] == pytest.approx(-135.0)
    assert lat[1] == pytest.approx(-89.5 + np.degrees(1.0 / 1737.4), abs=1e-6)   # 1 km north
