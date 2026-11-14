"""Site feasibility (hard limits) and site score (weighted cost function). See docs/PARAMETERS.md.

Feasible = the site meets every limit the user set. Score = weighted mean of sub-scores, each 0 (worst) .. 1 (best).
Both depend only on user inputs: no threshold is hard-coded as a "requirement".
"""
from __future__ import annotations

from . import config

# limit name -> (parameter it checks, True if the parameter must be >= the limit, False if <=)
LIMITS = {
    "min_sunlit_frac": ("sunlit_frac", True),
    "max_dark_h": ("longest_dark_h", False),
    "min_earth_visible_frac": ("earth_visible_frac", True),
    "max_no_earth_h": ("longest_no_earth_h", False),
    "max_slope_deg": ("slope_deg", False),
    "min_energy_margin_kwh": ("energy_margin_kwh", True),
}


def sub_scores(p: dict) -> dict[str, float | None]:
    """Each scored parameter mapped to 0..1 (1 = best). None = parameter not available."""
    window_h = p["window_h"]
    slope = p.get("slope_deg")
    return {
        "sunlit_frac": p["sunlit_frac"],
        "longest_dark_h": 1.0 - min(p["longest_dark_h"] / window_h, 1.0),      # 1 = never dark, 0 = dark all the time
        "earth_visible_frac": p["earth_visible_frac"],
        "longest_no_earth_h": 1.0 - min(p["longest_no_earth_h"] / window_h, 1.0),
        "slope_deg": None if slope is None else 1.0 - min(slope / config.SLOPE_SCORE_ZERO_DEG, 1.0),
    }


def score(p: dict, weights: dict[str, float]) -> dict:
    """Weighted mean of the available sub-scores. Unavailable parameters and zero weights are left out."""
    subs = sub_scores(p)
    used = {k: (s, weights.get(k, 0.0)) for k, s in subs.items() if s is not None and weights.get(k, 0.0) > 0}
    total = sum(w for _, w in used.values())
    value = sum(s * w for s, w in used.values()) / total if total > 0 else None
    return {
        "value": value,
        "components": {k: {"score": s, "weight": weights.get(k, 0.0)} for k, s in subs.items()},
    }


def feasibility(p: dict, limits: dict[str, float | None]) -> dict:
    """Check the user limits. A limit on a parameter that is not available yet is reported in `not_checked`."""
    violations, not_checked = [], []
    for name, limit in limits.items():
        if limit is None:
            continue
        param, must_be_at_least = LIMITS[name]
        value = p.get(param)
        if value is None:
            not_checked.append(name)
        elif (value < limit) if must_be_at_least else (value > limit):
            violations.append({"limit": name, "parameter": param, "value": value, "limit_value": limit})
    return {"feasible": not violations, "violations": violations, "not_checked": not_checked}
