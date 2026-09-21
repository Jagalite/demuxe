<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research batch 11 — D52–D55

Start with [REPORT.md](REPORT.md) and [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md).

Four standalone executed screens, not a Demuxe application build or benchmark. Upfront declared-silence fragments and fixed-channel native finite filtering have scoped positive results. Late seamless audio repair fails, and the eviction/subtitle results are targeted correctness extensions.

## Reproduce

```sh
python scripts/run_all.py --output /tmp/demuxe-batch11-replay
```

Requires Python with NumPy, Pillow and Playwright, system Chromium, and FFmpeg with libx264/FLAC support. No browser/tool binaries are bundled or downloaded. The specified output directory must not exist; the command copies the scripts there and generates new fixtures and evidence. Do not overwrite the recorded evidence.

The browser uses `about:blank`, Blob URLs and authored data. `--no-sandbox` is used for this container; never use that setting for browsing untrusted material. Native/browser-owned is not proof of GPU/hardware acceleration.

`evidence/verification.json` records 100 consistency assertions. Passing assertions include correctly detecting failed candidates. They do not establish full player correctness, general codec support, CPU benefit, physical output fidelity or production readiness.

## Contents

`fixtures/` contains authored media and source/independent output data. `scripts/` contains the actual constructors, browser tests and checks. `evidence/` retains browser records, command logs, screenshots, manifests, initial negative outcomes and post-run analysis. `ITEMS.json` is a provisional import guide; `REPO_LINEAGE.md` prevents duplicate/reopened claims without the required scope change. `SHA256SUMS.json` covers each distributed file except itself.

Code and authored fixture bytes: MIT. Report/handoff prose: CC-BY-4.0. The reused `sha256.js` helper originates in the prior MIT batch-7 package. Third-party tools retain their own licenses. No font, executable, third-party decoder library or Demuxe production source is included.
