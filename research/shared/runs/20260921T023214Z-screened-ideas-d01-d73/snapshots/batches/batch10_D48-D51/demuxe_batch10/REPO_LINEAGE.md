<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Repository lineage review

Repository: `Jagalite/demuxe`. GitHub connector resolved `main` to `efd9e1537666b3120936ed24a34431645506e953`, commit message “Compare player CPU with per-fixture leaders and restore playback outcomes,” authored 2026-09-20T20:53:02Z. This is the commit used for the following reads, not a claim that it remains the latest branch head indefinitely. No production build, checkout, modification, commit, or push was performed for this batch.

These are summaries of connector-read records, not copied full repository files.

| New screen | Existing record reviewed | Recorded state and relationship |
|---|---|---|
| D48 | `research/items/R230.exact-mp3-seek-closure.report-continuity/README.md` | `stop_current_profile`. Its host subprocess performance failed despite exact scoped output. D48 tests a different endpoint, browser whole-file decoding of short suffix windows, and separates reservoir-byte coverage from output-state agreement. It does not reopen the failed subprocess cost profile. |
| D49 | `research/items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md` | `stop_current_profile`, actual-route fidelity failed. Its hybrid/software comparison diverged at chroma edges independently of rotation math. D49 compares crops of the SAME browser display path; it does not repair or supersede that cross-decoder failure. Also follows the earlier D29 metadata-only crop failures. |
| D50 | `research/items/R220.scoped-transport-clock-normalization/README.md` | `already_implemented`. Its 33-bit transport rollover handling must not acquire a second normalizer. D50 separately tests 64-bit fragmented-MP4 epoch reduction before conversion to browser time. |
| D51 | `research/items/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes/README.md` | `stop_current_profile`. Its selective FLAC bridge produced exact integer output but lost the complete-cost comparison. D51 renders a deliberately requested float crossfade from decoded buffers via Web Audio; it does not author a compressed export or promise the same integer-quantization contract. |

Canonical sources, pinned to the reviewed commit:

- https://github.com/Jagalite/demuxe/tree/efd9e1537666b3120936ed24a34431645506e953
- https://github.com/Jagalite/demuxe/blob/efd9e1537666b3120936ed24a34431645506e953/research/items/R230.exact-mp3-seek-closure.report-continuity/README.md
- https://github.com/Jagalite/demuxe/blob/efd9e1537666b3120936ed24a34431645506e953/research/items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md
- https://github.com/Jagalite/demuxe/blob/efd9e1537666b3120936ed24a34431645506e953/research/items/R220.scoped-transport-clock-normalization/README.md
- https://github.com/Jagalite/demuxe/blob/efd9e1537666b3120936ed24a34431645506e953/research/items/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes/README.md

These D-identifiers continue the conversation package numbering. Do not invent new canonical R-numbers or overwrite existing decisions during import. Investigate whether the maintained owner already implements the proposed behavior before adding any subsystem.
