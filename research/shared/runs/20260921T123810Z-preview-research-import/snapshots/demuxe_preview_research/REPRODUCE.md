<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Reproduction and file guide

## Preserve the captured run

The scripts intentionally write under their own parent directory's `results/` and `fixtures/`. **Run in a copy**, not in the immutable imported evidence directory. For example, after extracting the archive:

```sh
cp -a demuxe_preview_research preview-rerun
cd preview-rerun
python scripts/verify_manifest.py
mkdir -p previous-results
cp -a results/. previous-results/
```

The last two commands are optional insurance in the working copy. The original package already includes the fixtures and reference metadata; re-encoding with a different FFmpeg build may change their hashes. Preserve both old and new identities.

## Native prerequisites

The measured environment was Linux. Install or provide `ffmpeg`, `ffprobe`, GCC, libjpeg development headers/library, Python, Pillow, NumPy and scikit-image. FFmpeg must provide the fixture encoders libx264, libx265, libvpx-vp9, libaom-av1, MPEG-2 and MJPEG. Some packages split codec availability. Use the included fixtures when an encoder is absent rather than silently changing the input.

The measured Python package versions are recorded in `requirements-measured.txt`; these are an environment record, not a requirement to modify an existing project environment. The scripts use subprocess timeouts and bounded fixtures. Native results do not run Demuxe or its Wasm build.

```sh
# Optional: regenerate. Different encoder versions can change byte identities.
python scripts/make_fixtures.py
# Needed for a fresh generated fixture set; no browser dependency.
python scripts/prepare_metadata.py

python scripts/native_bench.py > results/native_bench.log 2>&1
python scripts/packet_bench.py > results/packet_bench.log 2>&1
python scripts/kernel_bench.py > results/kernel_bench.log 2>&1
python scripts/progressive_bench.py > results/progressive_bench.log 2>&1
python scripts/authored_control.py > results/authored_control.log 2>&1
```

`native_bench.py` produces three result files: low-resolution capabilities, keyframe skip behavior, and JPEG scaled decoding. `packet_bench.py` prepares small source-derived H.264/IVF views; preparation is excluded from its timings and the derived files are included in this archive. `kernel_bench.py` compiles temporary C executables/shared code, performs correctness checks, and benchmarks two compiler configurations. It requires GCC-style flags and a Unix-like toolchain. It is not a video decoder. `progressive_bench.py` compiles its native libjpeg utility in a temporary directory; no executable is distributed.

The deterministic DC-only counterexample is retained in `results/dc_adverse_control.json`. It is an algebraic adverse control, not a separate media decode benchmark.

## Browser continuation

Install Playwright in the chosen environment and provide a Chromium/Chrome executable. The current scaffold was blocked before executing any browser codec test; review `LOCAL_AGENT.md` before treating a local run as qualified. The script has post-attempt cleanup/configuration changes and a syntax check, but not an executed browser result here.

```sh
# Example on a Linux test host; use the actual browser executable path.
DEMUXE_CHROMIUM=/usr/bin/chromium DEMUXE_HEADLESS=0 \
  python scripts/browser_bench.py > results/browser_bench.log 2>&1
```

Headful operation requires a display. The default is headless unless `DEMUXE_HEADLESS=0`. Default launch does not disable the browser sandbox. `DEMUXE_NO_SANDBOX=1` is only a test-environment option where required; the original container attempt used no-sandbox and disable-dev-shm-usage flags. Neither those flags nor a hardware preference prove hardware decoding. Do not work around administrative navigation restrictions to force a result.

Use the runtime's normal overall job timeout in addition to reviewing operation-level deadlines. The scaffold is a component probe, not a production cancellation scheduler. Add per-section reporting if some APIs are unavailable so a missing video decoder does not hide an independently testable image path.

## Evidence files

`results/lowres_capabilities.json`: requested versus decoded dimensions and original stderr.

`results/native_keyframe_bench.json`: decoder-skip candidates, full-then-select baseline, hashes and raw trials; VP9 skipping is a semantic negative.

`results/packet_bench.json`: packet-selected VP9 results and H.264 coarse/exact comparisons, with explicit payload accounting exclusions.

`results/jpeg_bench.json`: same-source JPEG scaled decode, reference comparisons and original lossy authored controls.

`results/authored_control.json`: pixel-exact PNG and higher-quality JPEG prepared-asset controls.

`results/kernel_bench.json`: bounded transform correctness, NumPy oracle, sanitizer and per-build timing trials.

`results/progressive_bench.json`: retained-state first/final JPEG output, logical consumption and total-work penalty. Small PNG images preserve visible results; these are decoded test outputs, not generated concept art.

`results/browser_status.json`, `results/browser_bench.log`: environment block, not a codec failure. The original attempted source is in `notes/browser_harness_as_attempted.py.txt`.

`manifest.json` hashes all distributed files except itself. `scripts/verify_manifest.py` checks those hashes and sizes. This is artifact integrity, **not** media correctness or a check against a changed repository checkout.

## Licenses and attribution

See `NOTICES.md`, `Apache-2.0.txt` and `CC-BY-4.0.txt`. No upstream binary, font, movie, proprietary codec patch or research-paper PDF is bundled. Fixtures are synthetic and provenance is recorded. Primary source locations and repository references are in `sources.json`.
