"""Disk visibility against the horizon, and the time windows that follow from it."""
from __future__ import annotations

import numpy as np


def visible_disk_frac(el_deg: np.ndarray, radius_deg: np.ndarray, horizon_deg) -> np.ndarray:
    """Fraction (0..1) of a disk above the horizon, assuming the horizon is flat across the disk width.

    x = (el - horizon) / r is the height of the disk centre above the horizon in disk radii.
    The visible part is a circular segment: 1 - (acos(x) - x * sqrt(1 - x^2)) / pi.
    """
    x = np.clip((el_deg - horizon_deg) / radius_deg, -1.0, 1.0)
    return 1.0 - (np.arccos(x) - x * np.sqrt(1.0 - x * x)) / np.pi


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Contiguous True runs of a 1-D boolean array as (start, end_exclusive) index pairs."""
    d = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    return list(zip(np.flatnonzero(d == 1).tolist(), np.flatnonzero(d == -1).tolist()))


def longest_run_h(mask: np.ndarray, step_s: int) -> float:
    """Duration in hours of the longest True run. Runs cut by the window edges count only their part inside."""
    rs = runs(mask)
    return max(e - s for s, e in rs) * step_s / 3600.0 if rs else 0.0


def hours_to_first(mask: np.ndarray, step_s: int) -> float | None:
    """Hours from the window start to the first True sample; None if it never happens."""
    idx = np.flatnonzero(mask)
    return float(idx[0]) * step_s / 3600.0 if idx.size else None


def windows(mask: np.ndarray, times_utc, end_utc: str) -> list[dict]:
    """True runs as {start_utc, end_utc}. Resolution = the time step of `times_utc`."""
    n = len(times_utc)
    return [{"start_utc": times_utc[s], "end_utc": times_utc[e] if e < n else end_utc} for s, e in runs(mask)]
