# Demuxe focused research: D08–D13

Start with **REPORT.md** for scoped outcomes and limitations, then **LOCAL_AGENT_HANDOFF.md** for the next smallest gates.

This package contains standalone synthetic-media prototypes and their execution evidence. It does not contain or modify the Demuxe application. `scripts/build.py` performs bounded fixture construction, `scripts/browser.js` runs component checks, and `scripts/verify.py` cross-checks the records. No hardware or CPU-saving claim is made.

Verify `sha256sum -c checksums.sha256` before rerunning. Reproduce with `bash run_all.sh`. Requires Python, Playwright, Chromium, FFmpeg and FFprobe. Retained reference video/packet fixtures were self-authored in the preceding batch. See REPORT.md for exact research lineage and unresolved novelty scope.
