"""Validate data files against the contract schemas.

Usage:  python contracts/validate.py <dir>     e.g. data/processed  or  frontend/public/fixtures
Exit code 0 = all files valid, 1 = at least one problem.
"""
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

SCHEMA_DIR = Path(__file__).parent / "schemas"


def load_registry():
    resources = []
    for p in SCHEMA_DIR.glob("*.schema.json"):
        schema = json.loads(p.read_text())
        resources.append((p.name, Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def schema_for(rel: Path):
    """Map a path relative to the data dir to its schema file name."""
    if rel.parent.name in ("horizon", "ephemeris", "metrics"):
        return f"{rel.parent.name}.schema.json"
    if rel.name in ("manifest.json", "sites.json", "matrix.json"):
        return rel.name.replace(".json", ".schema.json")
    return None


def extra_checks(name: str, data: dict) -> list[str]:
    """Rules JSON Schema cannot express: equal-length parallel arrays, grid shape."""
    errs = []
    if name == "horizon.schema.json":
        if len(data["azimuth_deg"]) != len(data["horizon_elev_deg"]):
            errs.append("azimuth_deg and horizon_elev_deg differ in length")
    if name == "ephemeris.schema.json":
        n = len(data["time_utc"])
        for k, v in data.items():
            if isinstance(v, list) and k != "time_utc" and len(v) != n:
                errs.append(f"{k} has {len(v)} entries, time_utc has {n}")
    if name == "matrix.schema.json":
        ns, nd = len(data["site_ids"]), len(data["landing_dates_utc"])
        for k, grid in data["cells"].items():
            if len(grid) != ns or any(len(row) != nd for row in grid):
                errs.append(f"cells.{k} is not {ns} x {nd}")
    return errs


def main(root: Path) -> int:
    registry = load_registry()
    bad = 0
    files = sorted(root.rglob("*.json"))
    if not files:
        print(f"no .json files under {root}")
        return 1
    for f in files:
        rel = f.relative_to(root)
        name = schema_for(rel)
        if name is None:
            print(f"SKIP  {rel} (no schema for this path)")
            continue
        data = json.loads(f.read_text())
        v = Draft202012Validator(
            registry.get_or_retrieve(name).value.contents,
            registry=registry,
            format_checker=FormatChecker(),
        )
        errs = [f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message}" for e in v.iter_errors(data)]
        if not errs:
            errs = extra_checks(name, data)
        if errs:
            bad += 1
            print(f"FAIL  {rel}")
            for e in errs[:10]:
                print(f"      {e}")
        else:
            print(f"OK    {rel}")
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
