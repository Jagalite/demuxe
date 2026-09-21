<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research, batch 10 — D48–D51

Start with [REPORT.md](REPORT.md) and [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md).

This package contains four standalone component screens, not a maintained Demuxe build or benchmark. Two explicit-output operations have restricted positive results; strict browser MP3 window exactness failed; large-timestamp rebasing is primarily a robustness guard.

## Reproduce without overwriting the original evidence

The recorded environment is Python 3.13.5, NumPy, Pillow, Playwright, system Chromium 144.0.7559.96, and FFmpeg 7.1.5 on Linux. The FFmpeg build must include libmp3lame and libx264. Browser automation uses the Python Playwright package with `/usr/bin/chromium`; it does not download a browser. Browser binaries and third-party libraries are not bundled.

```sh
python scripts/run_all.py --output /tmp/demuxe-batch10-new-run
```

The command refuses an existing output directory, copies the harness there, generates the fixtures, executes the browser and host screens, and performs consistency checks. Source encoding or browser-version changes may change hashes and outcomes. Reconcile new output; do not overwrite the provided evidence or automatically call discrepancies regressions in Demuxe.

The playback screens use `about:blank` and Blob URLs. WebCodecs was unavailable in that context. No web server, network media, account credentials, or secret is required. Chromium is launched with `--no-sandbox` to fit this container: do not use that setting to browse untrusted content. Only locally authored fixture bytes are processed here.

## Contents

- `scripts/`: actual constructors, guards, host checks and browser tests.
- `fixtures/`: authored audio/video and transformed variants; no downloaded third-party media.
- `evidence/`: raw browser outcomes, host command log, screenshots, manifests and checks.
- `ITEMS.json`: item decisions and links for import as provisional D-identifiers.
- `REPO_LINEAGE.md`: pinned repository review and scope differences.
- `SHA256SUMS.json`: hashes of files in this package other than the hash index itself.

`evidence/verification.json` records consistency assertions. Passing assertions include detecting deliberate failures. They do not certify all candidates, all frames, integration, CPU improvement, hardware decode or physical display/audio fidelity.

Code and authored media are offered under MIT; report prose under CC-BY-4.0. Tools retain their own licenses. Prior-batch MIT harness utilities (`common.py`, `browser_base.js`, `video_browser.js`, `sha256.js`) were reused and locally extended; other scripts were authored for this batch. No Demuxe production source is included or modified.
