"""Build the offline glTF comparer's manifest from an operator's actual exports."""

import argparse
import hashlib
import json
from pathlib import Path


MODES = ("full", "no-normal", "no-ibl", "neither", "zero-normal")
ASSET = "a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8"


def create_manifest(directory, host, browser):
    if not host.strip() or not browser.strip():
        raise ValueError("host and browser version must be recorded by the operator")
    runs = {}
    for mode in MODES:
        path = directory / f"gltf-{mode}.json"
        raw = path.read_bytes()
        payload = json.loads(raw)
        width, height = payload["width"], payload["height"]
        if payload["mode"] != mode or (width, height) != (320, 320) or payload["hash"] != ASSET:
            raise ValueError(f"mode, dimensions or source asset did not match: {path.name}")
        pixels = payload["rgba"]
        if len(pixels) != width * height * 4 or any(type(value) is not int or not 0 <= value <= 255 for value in pixels):
            raise ValueError(f"invalid pixels: {path.name}")
        if not payload["renderer"].strip():
            raise ValueError(f"missing actual renderer: {path.name}")
        runs[mode] = {"file": path.name, "sha256": hashlib.sha256(raw).hexdigest()}
    return {"host": host, "browser": browser, "engine": "0.180.0", "runs": runs}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--host", required=True)
    parser.add_argument("--browser", required=True)
    args = parser.parse_args()
    result = create_manifest(args.directory, args.host, args.browser)
    with (args.directory / "manifest.json").open("x", encoding="utf-8") as output:
        json.dump(result, output, indent=2)
