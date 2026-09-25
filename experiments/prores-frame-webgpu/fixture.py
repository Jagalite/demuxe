#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Verify or reproduce the locked 642x360 one-frame ProRes Proxy fixture."""

import argparse
import hashlib
from pathlib import Path
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "fixtures/partial-642x360.mov"
EXPECTED_SHA256 = "7bff19784b3851aa4cbd4bfde1eaceea9821c66fc3f30c6b5ef1b5093cd67854"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--regenerate", action="store_true",
                        help="encode with FFmpeg and replace only if the locked hash matches")
    args = parser.parse_args()
    if args.regenerate:
        # Originally generated with Homebrew FFmpeg 8.1.2 prores_ks. Decoding,
        # coefficient capture, and the oracle all use locked FFmpeg 9.0.2.
        with tempfile.TemporaryDirectory() as directory:
            generated = Path(directory) / "partial-642x360.mov"
            subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error",
                            "-y", "-f", "lavfi", "-i",
                            "testsrc2=size=642x360:rate=30", "-frames:v", "1",
                            "-c:v", "prores_ks", "-profile:v", "0",
                            "-pix_fmt", "yuv422p10le", "-metadata",
                            "creation_time=1970-01-01T00:00:00Z", str(generated)], check=True)
            if sha256(generated) != EXPECTED_SHA256:
                raise RuntimeError("encoder output differs from locked fixture; original remains unchanged")
            FIXTURE.write_bytes(generated.read_bytes())
    actual = sha256(FIXTURE)
    if actual != EXPECTED_SHA256:
        raise RuntimeError(f"fixture SHA-256 {actual}; expected {EXPECTED_SHA256}")
    print(f"{FIXTURE}: SHA-256 {actual}")


if __name__ == "__main__":
    main()
