#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare one-block ProRes tests from the locked capture and FFmpeg oracle."""

import hashlib
import json
import mmap
from pathlib import Path
import random
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
COEFF = ROOT / "experiments/prores-coefficients"
sys.path.insert(0, str(COEFF))
from compare import records  # noqa: E402

BUILD = ROOT / "build/experiments/prores-idct-webgpu"
FFBUILD = ROOT / "build/experiments/prores-coefficients"
SOURCE = FFBUILD / "source"
OUTPUT = FFBUILD / "output"
CAPTURE = FFBUILD / "reference.dpc"
FIXTURE = ROOT / "experiments/webgpu-compute-decoder/raw/prores-proxy.mov"
RAW = BUILD / "frames.yuv"
ORACLE = BUILD / "oracle"
DECODER = BUILD / "decode_frames"
WIDTH, HEIGHT, FRAMES = 640, 360, 180
FRAME_BYTES = WIDTH * HEIGHT * 4
SELECTED_FRAMES = {0, 1, 17, 59, 90, 121, 150, 179}
SELECTED_SLICES = {0, 3, 27, 57, 114}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def wrap16(value: int) -> int:
    return (value + 32768) % 65536 - 32768


def compile_helper(source: str, output: Path, libs: list[str]) -> None:
    target = HERE / source
    libraries = [OUTPUT / f"{name}/{name}.a" for name in libs]
    if output.exists() and output.stat().st_mtime >= max(
        path.stat().st_mtime for path in [target, *libraries]
    ):
        return
    command = ["clang", "-O2", "-I", str(OUTPUT), "-I", str(SOURCE),
               str(target), *(str(path) for path in libraries),
               "-lm", "-o", str(output)]
    subprocess.run(command, check=True)


def ensure_ffmpeg() -> None:
    subprocess.run([sys.executable, str(COEFF / "run.py"), "build"], cwd=ROOT, check=True)
    if (SOURCE / "RELEASE").read_text().strip() != "9.0.2":
        raise RuntimeError("expected locked FFmpeg 9.0.2 source")
    version = subprocess.check_output([str(OUTPUT / "ffmpeg"), "-version"], text=True).splitlines()[0]
    if not version.startswith("ffmpeg version 9.0.2 "):
        raise RuntimeError(f"wrong reference version: {version}")
    capture_result = json.loads((COEFF / "result.json").read_text())
    if sha256(CAPTURE) != capture_result["parity"]["reference_sha256"]:
        raise RuntimeError("coefficient capture differs from validated reference")
    if sha256(FIXTURE) != capture_result["fixture_sha256"]:
        raise RuntimeError("fixture differs from the validated coefficient capture")


def ensure_references() -> None:
    BUILD.mkdir(parents=True, exist_ok=True)
    compile_helper("oracle.c", ORACLE, ["libavcodec", "libavutil"])
    compile_helper("decode_frames.c", DECODER, ["libavformat", "libavcodec", "libavutil"])
    if not RAW.exists() or RAW.stat().st_size != FRAME_BYTES * FRAMES or \
            RAW.stat().st_mtime < max(DECODER.stat().st_mtime, FIXTURE.stat().st_mtime):
        with RAW.open("wb") as out:
            subprocess.run([str(DECODER), str(FIXTURE)], stdout=out, check=True)
    if RAW.stat().st_size != FRAME_BYTES * FRAMES:
        raise RuntimeError("normal FFmpeg decoder produced incomplete raw frames")


def synthetic() -> list[dict]:
    cases = []

    def add(category: str, label: str, coefficients: list[int], matrix=None, qscale=1) -> None:
        cases.append({"id": label, "category": category, "coefficients": coefficients,
                      "matrix": matrix or [1] * 64, "qscale": qscale})

    def single(index: int, value: int) -> list[int]:
        values = [0] * 64
        values[index] = value
        return values

    add("dc_only", "zero", [0] * 64)
    for value in range(-33, 34):
        add("rounding_boundary", f"dc_round_{value}", single(0, value))
    for value in (-32768, -20000, -16384, -16256, -16000,
                  16000, 16256, 16384, 20000, 32767):
        add("clipping_boundary", f"dc_clip_{value}", single(0, value))
    for index in (1, 7, 8, 9, 63):
        for value in (1, 17, 256, -1, -17, -256):
            category = "positive_ac" if value > 0 else "negative_ac"
            add(category, f"ac_{index}_{value}", single(index, value))
    for offset in range(4):
        values = [0] * 64
        for index in (0, 1, 8, 9, 18, 63):
            values[index] = (-1 if (index + offset) % 2 else 1) * (3 + index + offset)
        add("sparse", f"sparse_{offset}", values)
    rng = random.Random(902)
    for seed in range(8):
        values = [rng.randint(-4096, 4095) for _ in range(64)]
        add("dense", f"dense_{seed}", values, qscale=(1, 4, 16, 128)[seed % 4])
    for qscale in (1, 127, 128, 132, 512):
        matrix = [1, 127, 128, 255] * 16
        values = [(-1 if i % 2 else 1) * (1, 64, 255, 32767)[i % 4]
                  for i in range(64)]
        add("quantization_boundary", f"quant_{qscale}", values, matrix, qscale)
    return cases


def real_cases() -> list[dict]:
    cases = []
    slice_meta = None
    for kind, item in records(CAPTURE):
        if kind == "slice":
            slice_meta = item
        if kind != "component" or item["frame"] not in SELECTED_FRAMES \
                or item["slice"] not in SELECTED_SLICES:
            continue
        if slice_meta is None or item["frame"] != slice_meta["frame"] or item["slice"] != slice_meta["slice"]:
            raise RuntimeError("capture component/slice ordering changed")
        if item["field"] or slice_meta["field"]:
            raise RuntimeError("fixture is expected to be progressive")
        component = item["component"]
        block_indices = (0, item["blocks"] - 1)
        for block_index in block_indices:
            per_mb = 4 if component == 0 else 2
            mb = block_index // per_mb
            position = block_index % per_mb
            x = (slice_meta["mb_x"] + mb) * (16 if component == 0 else 8)
            y = slice_meta["mb_y"] * 16 + (8 if (position // 2 if component == 0 else position) else 0)
            if component == 0 and position % 2:
                x += 8
            plane_width = WIDTH if component == 0 else WIDTH // 2
            if x + 8 > plane_width or y + 8 > HEIGHT:
                continue  # Padding blocks outside the visible 360-line frame.
            first = block_index * 64
            matrix = slice_meta["luma_matrix" if component == 0 else "chroma_matrix"]
            cases.append({"id": f"f{item['frame']}_s{item['slice']}_c{component}_b{block_index}",
                          "category": "real_fixture", "coefficients": list(item["coefficients"][first:first + 64]),
                          "matrix": list(matrix), "qscale": slice_meta["qscale"],
                          "location": {"frame": item["frame"], "slice": item["slice"],
                                       "component": component, "block": block_index,
                                       "x": x, "y": y}})
    if len(cases) < 200:
        raise RuntimeError(f"too few real fixture blocks: {len(cases)}")
    return cases


def decode_pixels(raw: mmap.mmap, location: dict) -> list[int]:
    component = location["component"]
    plane_width = WIDTH if component == 0 else WIDTH // 2
    plane_offset = 0 if component == 0 else WIDTH * HEIGHT * 2 + (component - 1) * plane_width * HEIGHT * 2
    frame_offset = location["frame"] * FRAME_BYTES + plane_offset
    return [struct.unpack_from("<H", raw, frame_offset + (location["y"] + y) * plane_width * 2
                               + (location["x"] + x) * 2)[0]
            for y in range(8) for x in range(8)]


def attach_reference(cases: list[dict]) -> dict:
    request = bytearray()
    for case in cases:
        request += struct.pack("<64h", *case["coefficients"])
        scaled = [wrap16(value * case["qscale"]) for value in case["matrix"]]
        request += struct.pack("<64h", *scaled)
    response = subprocess.run([str(ORACLE)], input=request, stdout=subprocess.PIPE, check=True).stdout
    if len(response) != len(cases) * 128:
        raise RuntimeError("FFmpeg DSP oracle response count mismatch")
    real_count = 0
    with RAW.open("rb") as stream, mmap.mmap(stream.fileno(), 0, access=mmap.ACCESS_READ) as raw:
        for index, case in enumerate(cases):
            expected = list(struct.unpack_from("<64H", response, index * 128))
            if case["category"] == "real_fixture":
                decoded = decode_pixels(raw, case["location"])
                if expected != decoded:
                    first = next(i for i, (a, b) in enumerate(zip(expected, decoded)) if a != b)
                    raise RuntimeError(f"FFmpeg DSP/normal decoder mismatch at {case['id']} "
                                       f"sample {first}: DSP={expected[first]} decoder={decoded[first]}")
                real_count += 1
                case["expected"] = decoded
            else:
                case["expected"] = expected
    clipping = [sample for case in cases if case["category"] == "clipping_boundary"
                for sample in case["expected"]]
    if min(clipping) != 4 or max(clipping) != 1019:
        raise RuntimeError(f"clipping boundary cases missed FFmpeg limits: {min(clipping)}, {max(clipping)}")
    rounding = sorted((case["coefficients"][0], case["expected"][0])
                      for case in cases if case["category"] == "rounding_boundary")
    transitions = [(before[0], after[0]) for before, after in zip(rounding, rounding[1:])
                   if after[0] == before[0] + 1 and after[1] != before[1]]
    if not any(left < 0 for left, _ in transitions) or not any(left >= 0 for left, _ in transitions):
        raise RuntimeError(f"rounding sweep missed negative or positive transition: {transitions}")
    return {"real_decoder_parity_blocks": real_count,
            "rounding_transitions": transitions,
            "oracle": "FFmpeg 9.0.2 ff_proresdsp_init(..., 10).idct_put",
            "normal_decoder": "FFmpeg 9.0.2 libavcodec prores via libavformat MOV"}


def arithmetic_stress(cases: list[dict]) -> dict:
    scaled_wraps = dequant_wraps = row_sum_wraps = 0
    for case in cases:
        block = []
        for coefficient, matrix in zip(case["coefficients"], case["matrix"]):
            scaled = matrix * case["qscale"]
            scaled_wraps += not (-32768 <= scaled <= 32767)
            scaled = wrap16(scaled)
            dequantized = coefficient * scaled
            dequant_wraps += not (-32768 <= dequantized <= 32767)
            block.append(wrap16(dequantized))
        for row in range(8):
            value = block[row * 8:row * 8 + 8]
            a0 = 16384 * value[0] + 16384 + 21407 * value[2] + 16384 * value[4] + 8867 * value[6]
            b0 = 22725 * value[1] + 19265 * value[3] + 12873 * value[5] + 4520 * value[7]
            row_sum_wraps += not (-2**31 <= a0 + b0 < 2**31)
    return {"scaled_matrix_i16_wraps": scaled_wraps,
            "dequantized_coefficient_i16_wraps": dequant_wraps,
            "row_a0_plus_b0_signed_i32_overflows": row_sum_wraps}


def main() -> None:
    ensure_ffmpeg()
    ensure_references()
    cases = synthetic() + real_cases()
    reference = attach_reference(cases)
    output = BUILD / "cases.json"
    output.write_text(json.dumps(cases, separators=(",", ":")) + "\n")
    categories = {name: sum(case["category"] == name for case in cases)
                  for name in sorted({case["category"] for case in cases})}
    summary = {"cases": len(cases), "categories": categories,
               "samples": len(cases) * 64, "cases_sha256": sha256(output),
               "capture_sha256": sha256(CAPTURE), "fixture_sha256": sha256(FIXTURE),
               "raw_decoder_sha256": sha256(RAW),
               "arithmetic_stress": arithmetic_stress(cases), **reference}
    (BUILD / "dataset.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
