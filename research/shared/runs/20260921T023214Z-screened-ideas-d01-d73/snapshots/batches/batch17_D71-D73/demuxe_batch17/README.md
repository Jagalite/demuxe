<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe research batch 17

Start with [REPORT.md](REPORT.md) and [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md). D71–D73 cover native reverse views for independent video, sparse-video duration preservation, and coded versus displayed geometry.

## Reproduce

Use a fresh working copy so the original evidence stays immutable. Requirements: Python 3 with numpy and Playwright, Chromium at `/usr/bin/chromium`, and FFmpeg/ffprobe with libx264 and libvpx-vp9. The recorded environment uses Python 3.13, Chromium 144 and FFmpeg 7.1.5. No GPU setup or Demuxe checkout is required, and no maintained Demuxe runtime is executed.

```sh
python scripts/reproduce.py
```

This builds synthetic media, runs real host/browser comparisons, and writes `evidence/verification.json`. Individual jobs in `scripts/reproduce.py` can be run separately in environments with execution limits. Browser failure controls intentionally time out or produce expected errors. Use their named assertions rather than treating every media error as a harness failure.

`fixtures/` contains generated sources and fragment views, not hundreds of independent test subjects. `evidence/replay/` retains a separate clean-directory replay's records. `FIXTURE_HASHES.json` and `SHA256SUMS.json` record file identity. The outer SHA manifest excludes itself.

## Licensing

Original experiment code is MIT-licensed (see LICENSE-CODE.txt). Reports are CC-BY-4.0. The synthetic authored source imagery is dedicated to CC0; encoded fixtures derive only from those generated sources. No font files, third-party movie media, or bundled tool binaries are included.
