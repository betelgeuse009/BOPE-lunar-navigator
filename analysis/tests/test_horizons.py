"""Regression test against JPL Horizons, using the cached replies in data/validation/horizons/ (no network).

Refresh the cache and the report with:  .venv/Scripts/python.exe -m analysis.validate_horizons --refresh
"""
import pytest

from analysis import validate_horizons as vh

CACHED = all((vh.CACHE_DIR / f"{s}_{b.lower()}.txt").exists() for s, _, _ in vh.SITES for b, _ in vh.BODIES)


@pytest.mark.skipif(not CACHED, reason="no cached Horizons replies; run python -m analysis.validate_horizons")
def test_api_matches_jpl_horizons():
    for r in vh.run(refresh=False):
        label = f"{r['site']} {r['body']}"
        assert r["api"]["sep_deg"].max() <= vh.TOLERANCE_DEG, label           # what the front end receives
        assert r["engine"]["sep_deg"].max() <= vh.TOLERANCE_DEG / 100, label   # full precision: 1e-4 deg
        assert abs(r["engine"]["d_dist_km"]).max() < 1.0, label
