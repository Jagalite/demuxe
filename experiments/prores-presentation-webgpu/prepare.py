#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare locked coefficients and validation-only FFmpeg 9.0.2 RGB oracles."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BUILD = ROOT / "build/experiments/prores-presentation-webgpu"
FRAME_BUILD = ROOT / "build/experiments/prores-frame-webgpu"
FFBUILD = ROOT / "build/experiments/prores-coefficients"
REFERENCE = BUILD / "reference_rgb"
COLOR_PROBE = BUILD / "probe_color"
TAGGED_HASH = "389c4e49b100f661ea1d0d46632c90239f447a10d9ecbf4c2841974ae328e9d4"

CASES = [
    {"id": "main-000-709-limited", "fixture": "main", "frame": 0,
     "matrix": "bt709", "fullRange": False},
    {"id": "main-090-709-limited", "fixture": "main", "frame": 90,
     "matrix": "bt709", "fullRange": False},
    {"id": "main-179-709-limited", "fixture": "main", "frame": 179,
     "matrix": "bt709", "fullRange": False},
    {"id": "partial-000-709-limited", "fixture": "partial", "frame": 0,
     "matrix": "bt709", "fullRange": False, "metadataSource": "partialTagged"},
    {"id": "main-000-601-limited", "fixture": "main", "frame": 0,
     "matrix": "bt601", "fullRange": False},
    {"id": "main-000-709-full", "fixture": "main", "frame": 0,
     "matrix": "bt709", "fullRange": True},
    {"id": "partial-000-709-crop", "fixture": "partial", "frame": 0,
     "matrix": "bt709", "fullRange": False, "metadataSource": "partialTagged",
     "crop": {"x": 2, "y": 4, "width": 638, "height": 352}},
]


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    subprocess.run([sys.executable, str(ROOT / "experiments/prores-frame-webgpu/prepare.py")],
                   cwd=ROOT, check=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    libs = [FFBUILD / f"output/{name}/{name}.a" for name in ("libswscale", "libavutil")]
    if not REFERENCE.exists() or REFERENCE.stat().st_mtime < max(
            path.stat().st_mtime for path in [HERE / "reference_rgb.c", *libs]):
        subprocess.run(["clang", "-O2", "-I", str(FFBUILD / "output"),
                        "-I", str(FFBUILD / "source"), str(HERE / "reference_rgb.c"),
                        *(str(path) for path in libs), "-lm", "-o", str(REFERENCE)], check=True)
    decoder_libs = [FFBUILD / f"output/{name}/{name}.a" for name in
                    ("libavformat", "libavcodec", "libavutil")]
    if not COLOR_PROBE.exists() or COLOR_PROBE.stat().st_mtime < max(
            path.stat().st_mtime for path in [HERE / "probe_color.c", *decoder_libs]):
        subprocess.run(["clang", "-O2", "-I", str(FFBUILD / "output"),
                        "-I", str(FFBUILD / "source"), str(HERE / "probe_color.c"),
                        *(str(path) for path in decoder_libs), "-lm", "-o", str(COLOR_PROBE)],
                       check=True)
    frame_manifest = json.loads((FRAME_BUILD / "manifest.json").read_text())
    main_fixture = ROOT / "experiments/webgpu-compute-decoder/raw/prores-proxy.mov"
    partial_fixture = ROOT / "experiments/prores-frame-webgpu/fixtures/partial-642x360.mov"
    tagged_fixture = BUILD / "partial-header-bt709.mov"
    packet = bytearray(partial_fixture.read_bytes())
    marker = packet.find(b"icpf")
    if marker < 4 or packet.find(b"icpf", marker + 4) >= 0 or packet[marker + 20] != 2:
        raise RuntimeError("unexpected ProRes frame-header matrix location")
    packet[marker + 20] = 1  # AVCOL_SPC_BT709; coefficient bytes stay intact.
    tagged_fixture.write_bytes(packet)
    if sha256(tagged_fixture) != TAGGED_HASH:
        raise RuntimeError("tagged fixture differs from locked metadata-only variant")
    def color(path):
        return json.loads(subprocess.check_output([str(COLOR_PROBE), str(path)], text=True))
    source_color = {"main": color(main_fixture), "partial": color(partial_fixture),
                    "partialTagged": color(tagged_fixture)}
    if any(item["pixelFormat"] != "yuv422p10le" or item["rangeCode"] != 1
           for item in source_color.values()) or \
            source_color["main"]["matrixCode"] != 2 or \
            source_color["partial"]["matrixCode"] != 2 or \
            source_color["partialTagged"]["matrixCode"] != 1:
        raise RuntimeError("unexpected FFmpeg 9.0.2 source color metadata")
    tagged_capture = BUILD / "partial-tagged.dpc"
    env = os.environ.copy()
    env["DEMUXE_PRORES_MODE"] = "reference"
    env["DEMUXE_PRORES_CAPTURE"] = str(tagged_capture)
    subprocess.run([str(FFBUILD / "output/ffmpeg"), "-hide_banner", "-nostdin",
                    "-loglevel", "error", "-threads", "1", "-thread_type", "slice",
                    "-c:v", "prores", "-i", str(tagged_fixture), "-map", "0:v:0",
                    "-an", "-sn", "-dn", "-f", "null", "-"],
                   env=env, stdout=subprocess.DEVNULL, check=True)
    sys.path.insert(0, str(ROOT / "experiments/prores-coefficients"))
    from compare import compare_captures  # noqa: E402
    tagged_parity = compare_captures(FRAME_BUILD / "partial/reference.dpc", tagged_capture)
    tagged_raw = BUILD / "partial-tagged.yuv"
    with tagged_raw.open("wb") as stream:
        subprocess.run([str(FRAME_BUILD / "decode_frames"), str(tagged_fixture),
                        "642", "360", "1"], stdout=stream, check=True)
    if sha256(tagged_raw) != sha256(FRAME_BUILD / "partial/frames.yuv"):
        raise RuntimeError("metadata-only variant changed decoded YUV samples")
    results = []
    generated = {}
    for case in CASES:
        info = frame_manifest["fixtures"][case["fixture"]]
        width, height = info["width"], info["height"]
        raw = ROOT / "build/experiments/prores-idct-webgpu/frames.yuv" if case["fixture"] == "main" \
            else FRAME_BUILD / "partial/frames.yuv"
        reference_name = f"{case['fixture']}-{case['frame']:03}-{case['matrix']}-{'full' if case['fullRange'] else 'limited'}.rgba"
        reference_path = BUILD / reference_name
        if reference_name not in generated:
            with reference_path.open("wb") as stream:
                subprocess.run([str(REFERENCE), str(raw), str(case["frame"]),
                                str(width), str(height), case["matrix"][2:],
                                "full" if case["fullRange"] else "limited"],
                               stdout=stream, check=True)
            if reference_path.stat().st_size != width * height * 4:
                raise RuntimeError(f"incomplete FFmpeg RGB reference: {reference_name}")
            generated[reference_name] = sha256(reference_path)
        results.append({**case, "width": width, "height": height,
                        "referenceFile": reference_name,
                        "referenceSha256": generated[reference_name]})
    manifest = {"ffmpeg": "9.0.2", "frames": frame_manifest["fixtures"],
                "cases": results, "rgbReferenceBinarySha256": sha256(REFERENCE),
                "sourceColor": source_color, "taggedFixtureSha256": TAGGED_HASH,
                "taggedCoefficientParity": tagged_parity,
                "taggedDecodedYuvSha256": sha256(tagged_raw)}
    (BUILD / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"cases": len(results), "uniqueFFmpegRGBReferences": len(generated),
                      "matrices": sorted({case["matrix"] for case in results}),
                      "ranges": sorted({case["fullRange"] for case in results})}))


if __name__ == "__main__":
    main()
