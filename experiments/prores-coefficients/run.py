#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build and run the isolated FFmpeg 9.0.2 ProRes coefficient experiment."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import statistics
import subprocess
import sys

from compare import compare_captures

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BUILD = ROOT / "build/experiments/prores-coefficients"
SOURCE = BUILD / "source"
OUTPUT = BUILD / "output"
FFMPEG = OUTPUT / "ffmpeg"
BUILD_SIGNATURE = BUILD / "signature.json"
ARCHIVE = ROOT / "build/downloads/ffmpeg.tar.gz"
FIXTURE = ROOT / "experiments/webgpu-compute-decoder/raw/prores-proxy.mov"
ARCHIVE_SHA256 = "6e374ed621e48faa40639307dff48ba6fe574a509977956d2cce9669b7cc27e9"
FIXTURE_SHA256 = "8941d8cb5637152e8af274153250245c2ba61693b58f2648b98d0a1f3caf6543"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checked_input() -> None:
    for path, expected in ((ARCHIVE, ARCHIVE_SHA256), (FIXTURE, FIXTURE_SHA256)):
        actual = sha256(path)
        if actual != expected:
            raise RuntimeError(f"{path}: SHA-256 {actual}, expected {expected}")


def build() -> None:
    checked_input()
    signature = {"archive": ARCHIVE_SHA256,
                 "instrument": sha256(HERE / "instrument.py"),
                 "probe": sha256(HERE / "probe.h")}
    previous = json.loads(BUILD_SIGNATURE.read_text()) if BUILD_SIGNATURE.exists() else None
    if FFMPEG.exists():
        if previous != signature:
            raise RuntimeError(f"stale experiment binary; remove generated {BUILD} and rebuild")
        return
    if previous is not None and previous != signature:
        raise RuntimeError(f"stale instrumented source; remove generated {BUILD} and rebuild")
    BUILD.mkdir(parents=True, exist_ok=True)
    if not (SOURCE / "libavcodec/probe.h").exists():
        SOURCE.mkdir(exist_ok=True)
        subprocess.run(["tar", "-xzf", str(ARCHIVE), "--strip-components=1",
                        "-C", str(SOURCE)], check=True)
        subprocess.run([sys.executable, str(HERE / "instrument.py"), str(SOURCE)], check=True)
    OUTPUT.mkdir(exist_ok=True)
    # FFmpeg's version.sh otherwise discovers Demuxe's enclosing .git and
    # mislabels this released source tree with the Demuxe commit description.
    build_env = os.environ.copy()
    build_env["GIT_CEILING_DIRECTORIES"] = str(BUILD)
    if not (OUTPUT / "config.mak").exists():
        configure = [
            str(SOURCE / "configure"), "--disable-everything", "--disable-autodetect",
            "--disable-doc", "--disable-network", "--disable-hwaccels",
            "--disable-programs", "--enable-ffmpeg", "--enable-decoder=prores",
            "--enable-demuxer=mov", "--enable-protocol=file", "--enable-muxer=null",
            "--enable-encoder=wrapped_avframe", "--enable-filter=null",
        ]
        with (BUILD / "configure.log").open("w") as log:
            subprocess.run(configure, cwd=OUTPUT, env=build_env,
                           stdout=log, stderr=subprocess.STDOUT, check=True)
    with (BUILD / "make.log").open("w") as log:
        subprocess.run(["make", "-j4", "ffmpeg"], cwd=OUTPUT,
                       env=build_env, stdout=log, stderr=subprocess.STDOUT, check=True)
    BUILD_SIGNATURE.write_text(json.dumps(signature, indent=2) + "\n")
    print(f"built {FFMPEG}")


def decode(mode: str, capture: Path | None = None) -> str:
    env = os.environ.copy()
    env["DEMUXE_PRORES_MODE"] = mode
    if capture:
        env["DEMUXE_PRORES_CAPTURE"] = str(capture)
    command = [str(FFMPEG), "-hide_banner", "-nostdin", "-loglevel", "error",
               "-threads", "1", "-thread_type", "slice", "-c:v", "prores",
               "-i", str(FIXTURE), "-map", "0:v:0", "-an", "-sn", "-dn",
               "-f", "null", "-"]
    result = subprocess.run(command, env=env, stdout=subprocess.DEVNULL,
                            stderr=subprocess.PIPE, text=True)
    if result.returncode or "error" in result.stderr.lower():
        raise RuntimeError(f"{mode}: FFmpeg exit {result.returncode}: {result.stderr}")
    return result.stderr


def verify_captures() -> dict:
    reference = BUILD / "reference.dpc"
    extraction = BUILD / "extraction.dpc"
    result = compare_captures(reference, extraction)
    result["reference_sha256"] = sha256(reference)
    result["extraction_sha256"] = sha256(extraction)
    result["capture_bytes"] = reference.stat().st_size
    if result["frames"] != 180:
        raise RuntimeError(f"expected all 180 frames, got {result['frames']}")
    print(json.dumps(result, indent=2))
    return result


def capture() -> dict:
    checked_input()
    decode("reference", BUILD / "reference.dpc")
    decode("extract", BUILD / "extraction.dpc")
    return verify_captures()


PROFILE = re.compile(r"PRORES_PROFILE mode=(\w+) frames=(\d+) components=(\d+) "
                     r"frame_cpu_ns=(\d+) coeff_cpu_ns=(\d+) recon_cpu_ns=(\d+)")


def profile(repeats: int) -> dict:
    checked_input()
    samples: dict[str, list[dict]] = {"full": [], "extract": []}
    for _ in range(repeats):
        # Pair both paths in each round; alternate order to reduce warm-cache bias.
        order = ("full", "extract") if len(samples["full"]) % 2 == 0 else ("extract", "full")
        for mode in order:
            output = decode(f"profile-{mode}")
            matches = PROFILE.findall(output)
            matches = [row for row in matches if int(row[1]) > 0]
            if len(matches) != 1:
                raise RuntimeError(f"missing profile: {output}")
            name, frames, components, frame_ns, coeff_ns, recon_ns = matches[0]
            if name != mode or int(frames) != 180:
                raise RuntimeError(f"incomplete profile: {output}")
            samples[mode].append({"frames": int(frames), "components": int(components),
                                  "frame_cpu_ms": int(frame_ns) / 1e6,
                                  "coeff_cpu_ms": int(coeff_ns) / 1e6,
                                  "recon_cpu_ms": int(recon_ns) / 1e6})
    median = {mode: {key: statistics.median(row[key] for row in rows)
                     for key in ("frame_cpu_ms", "coeff_cpu_ms", "recon_cpu_ms")}
              for mode, rows in samples.items()}
    full = median["full"]
    result = {"samples": samples, "median_ms_180_frames": median,
              "median_ms_per_frame": {mode: {key: value / 180 for key, value in row.items()}
                                      for mode, row in median.items()},
              "measured_reconstruction_fraction": full["recon_cpu_ms"] / full["frame_cpu_ms"],
              "profile_context": "native Apple Silicon, one FFmpeg decoder thread, thread CPU time; no capture I/O"}
    print(json.dumps(result, indent=2))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("build", "capture", "verify", "profile", "all"), nargs="?", default="all")
    parser.add_argument("--repeats", type=int, default=7)
    args = parser.parse_args()
    build()
    if args.phase == "build":
        return
    result_path = HERE / "result.json"
    results: dict = json.loads(result_path.read_text()) if result_path.exists() else {}
    results.update({"ffmpeg": "9.0.2", "fixture_sha256": FIXTURE_SHA256,
                    "archive_sha256": ARCHIVE_SHA256})
    if args.phase in ("capture", "all"):
        results["parity"] = capture()
    elif args.phase == "verify":
        results["parity"] = verify_captures()
    if args.phase in ("profile", "all"):
        results["profile"] = profile(args.repeats)
    result_path.write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
