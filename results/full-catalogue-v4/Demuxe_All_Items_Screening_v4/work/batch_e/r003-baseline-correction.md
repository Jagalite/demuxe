<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# R003 baseline configuration correction

The earlier batch-B source audit correctly identified cached bounded windows, but its wording cited RangeReader's 256 KiB constructor default. The actual native remux source owner overrides that default: `web/native-remux-source-worker.js:15` passes `blockBytes:65536` and `cacheBytes:2*1024*1024`. The faithful performance comparison must therefore retain the actual 64 KiB / 2 MiB remux baseline, not the generic reader default.

This does not change ADVANCE_CONFIRMATION or the source-only evidence level. Adaptive metadata/keyframe policy remains a distinct proposed change, and no runtime savings were measured. The owner bytes are preserved in `work/batch_e/snapshots/web__native-remux-source-worker.js`; the snapshot hash is recorded in `work/batch_e/source-snapshot-manifest.json`.

Preserve the prior audit as historical evidence and append this clarification when recording/reconciling R003. No ledger is modified by this note.
