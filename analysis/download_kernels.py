"""Download the five SPICE kernels (about 45 MB) from NASA NAIF into data/raw/kernel/.

Run from the repo root:   .venv/Scripts/python.exe -m analysis.download_kernels
Files that already exist are skipped. data/raw/ is git-ignored, so everyone downloads their own copy.
"""
from __future__ import annotations

import urllib.request

from . import config


def main() -> None:
    config.KERNEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, rel in config.KERNELS.items():
        path = config.KERNEL_DIR / name
        if path.exists():
            print(f"have  {name}")
            continue
        url = f"{config.NAIF_BASE_URL}/{rel}"
        print(f"get   {url}")
        tmp = path.with_suffix(path.suffix + ".part")
        urllib.request.urlretrieve(url, tmp)   # a partial download never leaves a broken kernel behind
        tmp.replace(path)
    print(f"kernels ready in {config.KERNEL_DIR}")


if __name__ == "__main__":
    main()
