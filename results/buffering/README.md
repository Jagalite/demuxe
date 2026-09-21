<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Buffering evidence

The committed summaries and qualification report record local browser trials,
including failures. `summary/index.json` records raw-result SHA-256 hashes,
source/runtime hashes, and local artifact locations. The full raw JSON, request
traces, screenshots, media fixtures and frozen runtime directories remain local;
they are not included in this source commit. Links to those artifacts in the
qualification report require the original local evidence directory.

`summary/metrics.json` is the retained earlier analysis; the later Firefox
follow-up has its own metrics and validation logs in its timestamped directory.
Do not infer that all historical trials used the final source revision.

See [qualification](../../docs/BUFFERING-VALIDATION.md) for outcomes and remaining
limits, and [reproduction](../../tests/buffering/README.md) for fixture preparation
and fresh runs. The prior cache experiment's raw evidence and frozen runtime
under `research/items/mpv-cache-browser-stream` also remain local; its report,
metrics, fixture manifest and reproduction tooling are committed.
