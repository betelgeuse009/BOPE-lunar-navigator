"""Names of lunar surface features for the "Labels" switch of the viewer: the IAU / USGS Gazetteer of Planetary
Nomenclature (centre points), turned into a small JSON file the front end reads (public/labels/moon_names.json).

Source: Gazetteer of Planetary Nomenclature, International Astronomical Union (IAU) Working Group for Planetary System
Nomenclature and USGS Astrogeology Science Center, https://planetarynames.wr.usgs.gov ; download
MOON_nomenclature_center_pts.zip (shapefile; coordinates on the IAU Moon 2000 sphere, R = 1737.4 km, planetocentric
latitude, east longitude 0..360).
Kept: features "Adopted by IAU", except the lettered satellite craters ("Satellite Feature", e.g. "Aristarchus A"),
which would crowd the map. Display only: the analysis never uses these names.
Usage (from frontend/): python3 scripts/nomenclature.py   (standard library only; downloads into data/raw/nomenclature)
"""
import io
import json
import struct
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

URL = "https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.zip"
REPO = Path(__file__).resolve().parents[2]
RAW = REPO / "data/raw/nomenclature/MOON_nomenclature_center_pts.zip"
OUT = Path(__file__).resolve().parents[1] / "public/labels/moon_names.json"


def read_dbf(data: bytes) -> list[dict]:
    """Records of a dBASE III table (the attribute table of the shapefile)."""
    n, header_len, record_len = struct.unpack("<IHH", data[4:12])
    fields, pos = [], 32
    while data[pos] != 0x0D:
        d = data[pos:pos + 32]
        fields.append((d[:11].split(b"\0")[0].decode(), d[16]))
        pos += 32
    rows = []
    for k in range(n):
        r, p, row = data[header_len + k * record_len:header_len + (k + 1) * record_len], 1, {}
        for name, length in fields:
            row[name] = r[p:p + length].decode("utf-8", "replace").strip()
            p += length
        rows.append(row)
    return rows


if not RAW.exists():
    RAW.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(URL, RAW)
with zipfile.ZipFile(RAW) as z:
    dbf = next(n for n in z.namelist() if n.endswith(".dbf"))
    rows = read_dbf(z.read(dbf))

names = []
for r in rows:
    if r["approval"] != "Adopted by IAU" or r["type"] == "Satellite Feature":
        continue
    lon = float(r["center_lon"])
    names.append([r["name"], round(float(r["center_lat"]), 3), round(lon - 360 if lon > 180 else lon, 3),
                  round(float(r["diameter"] or 0), 2), r["code"]])
names.sort(key=lambda x: -x[3])                      # largest first: the order labels are placed in
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "source": "IAU/USGS Gazetteer of Planetary Nomenclature, MOON_nomenclature_center_pts (" + URL + "), features adopted by "
              "the IAU without lettered satellite craters",
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "fields": ["name", "lat_deg", "lon_deg", "diameter_km", "type_code"],
    "names": names,
}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(len(names), "names ->", OUT)
