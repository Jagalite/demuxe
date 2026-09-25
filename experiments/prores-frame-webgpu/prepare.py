#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare full-frame ProRes coefficient streams and FFmpeg 9.0.2 oracles."""

import hashlib
import json
import math
import os
from pathlib import Path
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "experiments/prores-coefficients"))
from compare import compare_captures, records  # noqa: E402

BUILD = ROOT / "build/experiments/prores-frame-webgpu"
FFBUILD = ROOT / "build/experiments/prores-coefficients"
FFMPEG = FFBUILD / "output/ffmpeg"
SOURCE = FFBUILD / "source"
OUTPUT = FFBUILD / "output"
DECODER = BUILD / "decode_frames"
MAIN_FIXTURE = ROOT / "experiments/webgpu-compute-decoder/raw/prores-proxy.mov"
PARTIAL_FIXTURE = HERE / "fixtures/partial-642x360.mov"
MAIN_CAPTURE = FFBUILD / "reference.dpc"
MAIN_ORACLE = ROOT / "build/experiments/prores-idct-webgpu/frames.yuv"
PARTIAL_HASH = "7bff19784b3851aa4cbd4bfde1eaceea9821c66fc3f30c6b5ef1b5093cd67854"
MAIN_INFO = {"name": "main", "width": 640, "height": 360, "frames": 180}
PARTIAL_INFO = {"name": "partial", "width": 642, "height": 360, "frames": 1}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_decoder():
    BUILD.mkdir(parents=True, exist_ok=True)
    libraries = [OUTPUT / f"{name}/{name}.a" for name in
                 ("libavformat", "libavcodec", "libavutil")]
    if not DECODER.exists() or DECODER.stat().st_mtime < max(
            path.stat().st_mtime for path in [HERE / "decode_frames.c", *libraries]):
        command = ["clang", "-O2", "-I", str(OUTPUT), "-I", str(SOURCE),
                   str(HERE / "decode_frames.c"), *(str(path) for path in libraries),
                   "-lm", "-o", str(DECODER)]
        subprocess.run(command, check=True)


def capture_partial(target, mode):
    env = os.environ.copy()
    env["DEMUXE_PRORES_MODE"] = mode
    env["DEMUXE_PRORES_CAPTURE"] = str(target)
    command = [str(FFMPEG), "-hide_banner", "-nostdin", "-loglevel", "error",
               "-threads", "1", "-thread_type", "slice", "-c:v", "prores",
               "-i", str(PARTIAL_FIXTURE), "-map", "0:v:0", "-an", "-sn", "-dn",
               "-f", "null", "-"]
    subprocess.run(command, env=env, check=True, stdout=subprocess.DEVNULL)


def ensure_inputs():
    original = json.loads((ROOT / "experiments/prores-coefficients/result.json").read_text())
    if (SOURCE / "RELEASE").read_text().strip() != "9.0.2":
        raise RuntimeError("expected FFmpeg 9.0.2 source")
    version = subprocess.check_output([str(FFMPEG), "-version"], text=True).splitlines()[0]
    if not version.startswith("ffmpeg version 9.0.2 "):
        raise RuntimeError(f"unexpected coefficient capture decoder: {version}")
    if sha256(MAIN_FIXTURE) != original["fixture_sha256"]:
        raise RuntimeError("main fixture changed from validated coefficient harness")
    if sha256(MAIN_CAPTURE) != original["parity"]["reference_sha256"]:
        raise RuntimeError("main coefficient capture changed from validated harness")
    if MAIN_ORACLE.stat().st_size != 640 * 360 * 4 * 180:
        raise RuntimeError("normal FFmpeg 9.0.2 main frame oracle missing or incomplete")
    one_block = json.loads((ROOT / "experiments/prores-idct-webgpu/result.json").read_text())
    if sha256(MAIN_ORACLE) != one_block["dataset"]["raw_decoder_sha256"]:
        raise RuntimeError("main normal-decoder oracle changed from validated one-block proof")
    if sha256(PARTIAL_FIXTURE) != PARTIAL_HASH:
        raise RuntimeError("partial-width fixture hash changed")
    ensure_decoder()
    partial_dir = BUILD / "partial"
    partial_dir.mkdir(parents=True, exist_ok=True)
    reference = partial_dir / "reference.dpc"
    extraction = partial_dir / "extraction.dpc"
    capture_partial(reference, "reference")
    capture_partial(extraction, "extract")
    parity = compare_captures(reference, extraction)
    if parity["frames"] != 1:
        raise RuntimeError("partial fixture did not produce one frame")
    oracle = partial_dir / "frames.yuv"
    with oracle.open("wb") as stream:
        subprocess.run([str(DECODER), str(PARTIAL_FIXTURE), "642", "360", "1"],
                       check=True, stdout=stream)
    if oracle.stat().st_size != 642 * 360 * 4:
        raise RuntimeError("normal FFmpeg 9.0.2 partial frame oracle incomplete")
    return {"reference": reference, "oracle": oracle, "parity": parity}


def pack_matrix(entries):
    return [sum(entries[i + j] << (8 * j) for j in range(4))
            for i in range(0, 128, 4)]


def prepare_capture(info, capture):
    target = BUILD / info["name"]
    target.mkdir(parents=True, exist_ok=True)
    width, height = info["width"], info["height"]
    mb_width, mb_height = math.ceil(width / 16), math.ceil(height / 16)
    frames = []
    frame = None
    current_slice = None

    def finish_frame():
        if frame is None:
            return
        if current_slice is not None and len(current_slice["components"]) != 3:
            raise RuntimeError("incomplete final slice")
        frame_index = frame["frame"]
        if frame_index != len(frames):
            raise RuntimeError("nonsequential frame index")
        coverage = bytearray(mb_width * mb_height)
        source_bytes = bytearray()
        descriptors = []
        matrix_words = None
        mb_total = 0
        partial_count = 0
        for item in frame["slices"]:
            meta = item["meta"]
            components = item["components"]
            count, mb_x, mb_y = meta["mb_count"], meta["mb_x"], meta["mb_y"]
            if set(components) != {0, 1, 2} or meta["field"] != 0:
                raise RuntimeError("expected complete progressive 4:2:2 slice")
            if mb_y >= mb_height or mb_x + count > mb_width or count <= 0:
                raise RuntimeError("slice outside coded macroblock grid")
            for mb_x_local in range(mb_x, mb_x + count):
                index = mb_y * mb_width + mb_x_local
                if coverage[index]:
                    raise RuntimeError("overlapping macroblock slices")
                coverage[index] = 1
            if (mb_x + count) * 16 > width:
                partial_count += 1
            entries = (*meta["luma_matrix"], *meta["chroma_matrix"])
            packed = pack_matrix(entries)
            if matrix_words is None:
                matrix_words = packed
            elif matrix_words != packed:
                raise RuntimeError("frame has differing slice quant matrices")
            raw_offset = len(source_bytes) // 2
            for component, blocks_per_mb in ((0, 4), (1, 2), (2, 2)):
                record = components[component]
                if record["blocks"] != count * blocks_per_mb:
                    raise RuntimeError("wrong slice component block count")
                values = record["coefficients"]
                source_bytes.extend(struct.pack(f"<{len(values)}h", *values))
            descriptors.append({"slice": meta["slice"], "mbX": mb_x, "mbY": mb_y,
                                "mbCount": count, "qscale": meta["qscale"],
                                "rawCoefficientOffset": raw_offset,
                                "packedWordOffset": mb_total * 256})
            mb_total += count
        if not all(coverage):
            raise RuntimeError("macroblock coverage contains a hole")
        if mb_total != mb_width * mb_height:
            raise RuntimeError("macroblock count disagrees with geometry")
        binary = target / f"frame-{frame_index:03}.bin"
        binary.write_bytes(source_bytes)
        metadata = {"fixture": info["name"], "frame": frame_index,
                    "width": width, "height": height, "pts": frame["pts"],
                    "sliceCount": len(descriptors), "mbCount": mb_total,
                    "maxSliceMbCount": max(d["mbCount"] for d in descriptors),
                    "partialWidthSlices": partial_count,
                    "sliceWidths": sorted({d["mbCount"] for d in descriptors}),
                    "coefficientBytes": len(source_bytes),
                    "sourceCoefficientSha256": hashlib.sha256(source_bytes).hexdigest(),
                    "matrixWords": matrix_words, "slices": descriptors}
        (target / f"frame-{frame_index:03}.json").write_text(
            json.dumps(metadata, separators=(",", ":")) + "\n")
        frames.append({key: metadata[key] for key in
                       ("frame", "sliceCount", "mbCount", "maxSliceMbCount",
                        "partialWidthSlices", "coefficientBytes")})

    for kind, data in records(capture):
        if kind == "frame":
            finish_frame()
            if data["width"] != width or data["height"] != height or data["frame_type"] != 0:
                raise RuntimeError("unexpected frame geometry or field type")
            frame = {"frame": data["frame"], "pts": data["pts"], "slices": []}
            current_slice = None
        elif kind == "slice":
            if frame is None or data["frame"] != frame["frame"]:
                raise RuntimeError("slice outside expected frame")
            current_slice = {"meta": data, "components": {}}
            frame["slices"].append(current_slice)
        else:
            if current_slice is None or data["frame"] != frame["frame"] or \
                    data["slice"] != current_slice["meta"]["slice"]:
                raise RuntimeError("component outside current slice")
            if data["component"] in current_slice["components"]:
                raise RuntimeError("duplicate component")
            current_slice["components"][data["component"]] = data
    finish_frame()
    if len(frames) != info["frames"]:
        raise RuntimeError(f"expected {info['frames']} frames, found {len(frames)}")
    return frames


def main():
    partial = ensure_inputs()
    main_frames = prepare_capture(MAIN_INFO, MAIN_CAPTURE)
    partial_frames = prepare_capture(PARTIAL_INFO, partial["reference"])
    if partial_frames[0]["partialWidthSlices"] < 1 or \
            len(json.loads((BUILD / "partial/frame-000.json").read_text())["sliceWidths"]) < 2:
        raise RuntimeError("new fixture does not exercise partial width and multiple slice widths")
    manifest = {"ffmpeg": "9.0.2", "fixtures": {
        "main": {**MAIN_INFO, "fixtureSha256": sha256(MAIN_FIXTURE),
                 "captureSha256": sha256(MAIN_CAPTURE),
                 "oracleSha256": sha256(MAIN_ORACLE), "framesSummary": main_frames},
        "partial": {**PARTIAL_INFO, "fixtureSha256": PARTIAL_HASH,
                    "captureSha256": sha256(partial["reference"]),
                    "oracleSha256": sha256(partial["oracle"]),
                    "captureParity": partial["parity"], "framesSummary": partial_frames}}}
    (BUILD / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({name: {"frames": len(item["framesSummary"]),
                              "coefficientBytes": sum(f["coefficientBytes"] for f in item["framesSummary"]),
                              "partialWidthSlices": sum(f["partialWidthSlices"] for f in item["framesSummary"])}
                      for name, item in manifest["fixtures"].items()}, indent=2))


if __name__ == "__main__":
    main()
