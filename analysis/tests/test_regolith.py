"""Regolith context values (Diviner). Skipped when the files are not on disk."""
import numpy as np
import pytest

from analysis import regolith as rg

needs_temp = pytest.mark.skipif(rg.temperature_grids() is None, reason="Diviner temperature tables not on disk")
needs_h = pytest.mark.skipif(rg.h_grid() is None, reason="H-parameter map not on disk")
needs_ra = pytest.mark.skipif(rg.rock_grid() is None, reason="rock abundance map not on disk")


@needs_temp
def test_temperatures_are_physical_and_maximum_above_average():
    tmax, tavg, src = rg.temperature_k([0.67, 26.13, -45.46, -89.5], [23.47, 3.63, 177.59, -135.0])
    assert ((tmax > 30) & (tmax < 420)).all() and ((tavg > 20) & (tavg < 260)).all()
    assert (tmax > tavg).all()
    assert tmax[0] > 350                                  # equator at noon: about 390 K (Williams et al. 2017)
    assert "Polar" in src[3] and "Global" in src[0]       # south of 80 S the polar product is used


@needs_h
def test_h_parameter_typical_value_and_coverage():
    g = rg.h_grid()
    assert 0.05 < float(np.nanmedian(g)) < 0.09            # Hayne et al. 2017: global mean about 0.07 m
    assert np.isnan(rg.h_parameter_m(75.0, 0.0)[0])       # mapped 70 S to 70 N only


@needs_ra
def test_rock_abundance_fraction_and_coverage():
    ra = rg.rock_abundance_frac([0.67, -43.3], [23.47, -11.2])   # Apollo 11 mare plain; Tycho floor (young, rocky)
    assert 0 <= ra[0] < 0.05 and ra[1] > ra[0]
    assert np.isnan(rg.rock_abundance_frac(85.0, 0.0)[0])         # mapped 80 S to 80 N only
