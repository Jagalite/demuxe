# Demuxe research batch 13: D59–D61

See [REPORT.md](REPORT.md) for findings and [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md) for next gates.

This is a standalone reproducible experiment package, not a maintained Demuxe checkout or production patch. Its three questions are JPEG-in-TIFF rendering, destination-specific seek metadata repair, and native decoded-audio loop boundaries. Some candidate variants deliberately fail. No performance improvement is claimed.

Run into a new directory:

```sh
python scripts/run_all.py --out /tmp/demuxe-b13-fresh
```

Dependencies: Python, NumPy, Pillow with libTIFF, Playwright, system FFmpeg and `/usr/bin/chromium`. Full versions are recorded in `evidence/environment.json`. No external fixtures or runtime web requests are needed.

Code is MIT-licensed; authored fixtures are CC0; written report/handoff is CC-BY-4.0. The SHA-256 helper is carried from the user's prior MIT-licensed research batch with its header retained. No dependency binaries or fonts are included.
