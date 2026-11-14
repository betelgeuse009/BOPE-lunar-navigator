"""Uncertainty model checks (smooth sphere: no maps needed; the terrain case is in test_terrain-style API tests)."""
import pytest
from fastapi.testclient import TestClient

from analysis import ephemeris as eph, metrics, terrain, uncertainty
from analysis.api import app
from analysis.metrics import Inputs

client = TestClient(app)
SITE = {"lat_deg": -89.5, "lon_deg": -135.0, "start_utc": "2026-11-15T00:00:00Z"}
needs_maps = pytest.mark.skipif(not terrain.available(), reason="LOLA maps not on disk")


def _spread(inp, lat=-89.5, lon=-135.0):
    bv = eph.body_vectors("2026-11-15T00:00:00Z", "2026-11-29T00:00:00Z", 600)
    p = metrics.summarize(metrics.site_series(bv, lat, lon, inp), 0, slice(None), 600, inp)
    return p, uncertainty.spread(bv, lat, lon, inp, 600, p, weights={"sunlit_frac": 1.0}, limits={"max_dark_h": 1.0})


def test_no_uncertainty_inputs_give_zero():
    _, u = _spread(Inputs(use_terrain=False, position_uncertainty_m=0, horizon_uncertainty_deg=0))
    assert u["uncertainty"]["sunlit_frac"] == 0.0 and u["score_uncertainty"] == 0.0


def test_uncertainties_are_non_negative_and_ranges_bracket_the_value():
    p, u = _spread(Inputs(use_terrain=False))
    for k, v in u["uncertainty"].items():
        assert v is None or v >= 0, k
        r = u["components"].get(k, {}).get("range")
        if r is not None and p[k] is not None:
            assert r[0] <= p[k] <= r[1], k


def test_skyline_shift_moves_polar_sunlight():
    """At the pole the Sun grazes the horizon (1.04..1.58 deg in this window): a 1.5 deg skyline shift must hide it part of the time."""
    _, u = _spread(Inputs(use_terrain=False, position_uncertainty_m=0, horizon_uncertainty_deg=1.5))
    assert u["components"]["sunlit_frac"]["horizon"] > 0.01


def test_energy_required_has_no_uncertainty():
    _, u = _spread(Inputs(use_terrain=False, load_w=100.0))
    assert u["uncertainty"]["energy_required_kwh"] == 0.0     # load x time does not depend on the terrain


def test_api_evaluate_returns_uncertainties_and_risk():
    d = client.get("/api/evaluate", params={**SITE, "use_terrain": False, "horizon_uncertainty_deg": 1.0}).json()
    assert d["parameters"]["sunlit_frac"]["uncertainty"] is not None
    assert d["score"]["uncertainty"] is not None
    m = d["uncertainty_model"]
    assert m["position_uncertainty_m"] == 100.0 and m["horizon_uncertainty_deg"] == 1.0
    assert set(m["components"]["sunlit_frac"]) >= {"position", "horizon", "range"}
    assert d["requirements_violated_within_uncertainty"] in (0, 1) and isinstance(d["requirements_at_risk"], list)


@needs_maps
def test_requirement_at_risk_at_the_pole_example():
    """Nominal longest night ~65 h, but a ring point 100 m away is dark much longer: max_dark_h=70 is at risk."""
    d = client.get("/api/evaluate", params={**SITE, "max_dark_h": 70}).json()
    assert d["requirements_violated"] == 0 and d["requirements_at_risk"] == ["max_dark_h"]
    assert d["requirements_violated_within_uncertainty"] == 1
    assert d["parameters"]["elevation_m"]["uncertainty"] > d["terrain"]["height_error_m"]   # position term included
