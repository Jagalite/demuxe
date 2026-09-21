<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG XL reconstruction followed by browser JPEG decode

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

The actual pinned libjxl encoder accepts four existing grayscale/color JPEGs through JxlEncoderAddJPEGFrame and stores reconstruction metadata. A separate reconstruction process receives only each JXL file, uses JPEG_RECONSTRUCTION and a bounded 1 MiB JPEG output buffer, and emits every original JPEG byte exactly. It has no access to an original-JPEG sidecar or pixel reencoding shortcut. Chromium independently decodes all four original/reconstructed pairs: zero differences across 3,391,488 RGBA channels. Missing reconstruction metadata, truncated JXL and non-JPEG input reject; a 32-byte output cap rejects without a progress loop or partial output publication. All codec owners are destroyed; stale browser image generation is discarded, a fresh differently sized source survives, and all 10 ImageBitmaps close. Correctness passes for this original-JPEG reconstruction capability. Performance is not applicable to this additional representation endpoint; no decoder speed or general JPEG XL browser support is claimed. The libjxl reconstruction adapter is a host component, not a deployed Wasm/browser codec service. Production behavior is unchanged.

Next: Scoped reconstruction and browser-image gates are complete. A browser/Wasm deployment, larger reconstruction limits or a compression/cost claim requires its own bounded contract; retain rejection of JXL files without original-JPEG reconstruction metadata.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T233157Z-jxl-jpeg-reconstruction/analysis.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D34 — Recover original JPEG bytes from JPEG-origin JPEG XL, then use browser JPEG decoding**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch06_D31-D35/demuxe_batch6/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
