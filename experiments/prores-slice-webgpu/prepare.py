#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pack real FFmpeg 9.0.2 ProRes slices and normal-decoder sample oracles."""

import hashlib
import json
import mmap
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "experiments/prores-coefficients"))
from compare import records  # noqa: E402

BUILD = ROOT / "build/experiments/prores-slice-webgpu"
CAPTURE = ROOT / "build/experiments/prores-coefficients/reference.dpc"
RAW = ROOT / "build/experiments/prores-idct-webgpu/frames.yuv"
FIXTURE = ROOT / "experiments/webgpu-compute-decoder/raw/prores-proxy.mov"
COEFFICIENT_RESULT = ROOT / "experiments/prores-coefficients/result.json"
WIDTH, HEIGHT, FRAMES = 640, 360, 180
FRAME_BYTES = WIDTH * HEIGHT * 4
SELECTED = {(frame, slice_index) for frame in (0, 90, 179)
            for slice_index in (0, 4, 114)}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_inputs():
    result = json.loads(COEFFICIENT_RESULT.read_text())
    if sha256(CAPTURE) != result["parity"]["reference_sha256"]:
        raise RuntimeError("reference capture differs from the coefficient parity result")
    if sha256(FIXTURE) != result["fixture_sha256"]:
        raise RuntimeError("fixture differs from the coefficient parity result")
    if RAW.stat().st_size != FRAME_BYTES * FRAMES:
        raise RuntimeError("normal FFmpeg 9.0.2 frame capture missing or incomplete; run the one-block prepare.py")
    if RAW.stat().st_mtime < FIXTURE.stat().st_mtime:
        raise RuntimeError("normal-decoder frame capture predates the fixture")


def pack_words(values):
    if len(values) % 2:
        raise RuntimeError("odd coefficient count")
    return [(values[i] & 0xffff) | ((values[i + 1] & 0xffff) << 16)
            for i in range(0, len(values), 2)]


def frame_samples(raw, frame, mb_x, mb_y, visible_width, visible_height):
    x0, y0 = mb_x * 16, mb_y * 16
    base = frame * FRAME_BYTES
    planes = {}
    for name, offset, frame_stride, sx in (
            ("Y", 0, WIDTH, 1),
            ("U", WIDTH * HEIGHT * 2, WIDTH // 2, 2),
            ("V", WIDTH * HEIGHT * 3, WIDTH // 2, 2)):
        plane = []
        for y in range(visible_height):
            start = base + offset + 2 * ((y0 + y) * frame_stride + x0 // sx)
            count = visible_width // sx
            plane.extend(struct.unpack_from(f"<{count}H", raw, start))
        planes[name] = plane
    return planes


def main():
    validate_inputs()
    BUILD.mkdir(parents=True, exist_ok=True)
    selected = {}
    current = None
    all_counts = set()
    partial_width_slices = 0
    frame_types = {}
    for kind, value in records(CAPTURE):
        if kind == "frame":
            frame_types[value["frame"]] = value["frame_type"]
        elif kind == "slice":
            all_counts.add(value["mb_count"])
            if (value["mb_x"] + value["mb_count"]) * 16 > WIDTH:
                partial_width_slices += 1
            key = value["frame"], value["slice"]
            current = key if key in SELECTED else None
            if current is not None:
                selected[current] = {"meta": value, "components": {}}
        elif current is not None:
            assert (value["frame"], value["slice"]) == current
            selected[current]["components"][value["component"]] = value
    if set(selected) != SELECTED or any(len(item["components"]) != 3 for item in selected.values()):
        raise RuntimeError("selected capture slices are missing or incomplete")
    cases = []
    with RAW.open("rb") as stream, mmap.mmap(stream.fileno(), 0, access=mmap.ACCESS_READ) as raw:
        for frame, slice_index in sorted(selected):
            item = selected[frame, slice_index]
            meta, components = item["meta"], item["components"]
            mb_count = meta["mb_count"]
            coded_width = mb_count * 16
            visible_width = min(coded_width, WIDTH - meta["mb_x"] * 16)
            visible_height = min(16, HEIGHT - meta["mb_y"] * 16)
            if meta["field"] != 0 or frame_types[frame] != 0:
                raise RuntimeError("this proof expects progressive frames")
            if visible_width <= 0 or visible_width % 2 or visible_height <= 0:
                raise RuntimeError("invalid visible slice geometry")
            for component, count_per_mb in ((0, 4), (1, 2), (2, 2)):
                if components[component]["blocks"] != mb_count * count_per_mb:
                    raise RuntimeError("unexpected component block count")
            # Eight 8x8 blocks per macroblock: Y0..Y3, U0..U1, V0..V1.
            packed = []
            for mb in range(mb_count):
                for component, blocks_per_mb in ((0, 4), (1, 2), (2, 2)):
                    coeffs = components[component]["coefficients"]
                    start = mb * blocks_per_mb * 64
                    packed.extend(coeffs[start:start + blocks_per_mb * 64])
            matrices = (*meta["luma_matrix"], *meta["chroma_matrix"])
            matrix_words = [sum(matrices[i + j] << (8 * j) for j in range(4))
                            for i in range(0, 128, 4)]
            basic = {"id": f"frame{frame}-slice{slice_index}", "source": "real",
                     "frame": frame, "slice": slice_index, "mbX": meta["mb_x"],
                     "mbY": meta["mb_y"], "mbCount": mb_count,
                     "codedWidth": coded_width, "codedHeight": 16,
                     "visibleWidth": visible_width, "visibleHeight": visible_height,
                     "qscale": meta["qscale"], "matrixWords": matrix_words,
                     "coefficientWords": pack_words(packed),
                     "expected": frame_samples(raw, frame, meta["mb_x"], meta["mb_y"],
                                               visible_width, visible_height)}
            assert len(basic["coefficientWords"]) == mb_count * 256
            cases.append(basic)
            if frame == 0 and slice_index == 4:
                # This fixture has no actual partial-width ProRes slice. This
                # derived display crop exercises the same horizontal write guard.
                cropped = {**basic, "id": basic["id"] + "-derived-width-crop",
                           "source": "derived-width-crop", "visibleWidth": visible_width - 2}
                cropped["expected"] = frame_samples(raw, frame, meta["mb_x"], meta["mb_y"],
                                                     visible_width - 2, visible_height)
                cases.append(cropped)
    payload = json.dumps(cases, separators=(",", ":")).encode()
    (BUILD / "cases.json").write_bytes(payload)
    dataset = {"ffmpeg": "9.0.2", "fixtureSha256": sha256(FIXTURE),
               "captureSha256": sha256(CAPTURE), "rawSha256": sha256(RAW),
               "casesSha256": hashlib.sha256(payload).hexdigest(),
               "realCases": len(cases) - 1, "derivedCropCases": 1,
               "macroblockCountsInFixture": sorted(all_counts),
               "partialWidthSlicesInFixture": partial_width_slices,
               "visibleSamples": sum(sum(map(len, case["expected"].values())) for case in cases)}
    (BUILD / "dataset.json").write_text(json.dumps(dataset, indent=2) + "\n")
    print(json.dumps(dataset, indent=2))


if __name__ == "__main__":
    main()
