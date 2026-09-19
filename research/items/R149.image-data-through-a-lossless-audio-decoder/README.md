<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Image data through a lossless audio decoder

Full identity: `R149.image-data-through-a-lossless-audio-decoder`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Image-as-FLAC is unrelated to current audio output contract and both historical fixtures are larger than PNG. Browser recovery relies on a matched sample rate and nearest-grid decoding, not exact float PCM. No image carrier consumer exists and speakers must not receive carrier data.

Next action: Reopen only with a concrete available-decoder constraint and a corpus showing useful complete-cost advantage over ordinary image formats.

## Definition and contract

Two 128×96 RGB images were serialized as three channel-major planes, giving 36,864 carrier samples each. The integer packing is int16 = (uint8 - 128) × 128, encoded as mono 48 kHz FLAC. The native decoded PCM matches exactly. Chromium decodeAudioData at 48 kHz produces floats that are not exact multiples of the ideal scale in every case. Nearest-grid recovery, round(sample × 256 + 128), recovers every original byte. The maximum pre-rounding value error is below 0.0039, safely below half a data level on these fixtures. The earlier raw-float equality check was intentionally retained in browser_initial.json; the final claim is reversible integer recovery, not bit-identical floating-point PCM. At a 44.1 kHz context rate, resampling changes both count (36,864→33,868) and values, and the carrier is rejected. Context-rate resampling is part of the documented decoding contract [S6]. No carrier signal is connected to speakers.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R149.image-data-through-a-lossless-audio-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R149.image-data-through-a-lossless-audio-decoder.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R149.image-data-through-a-lossless-audio-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R149.image-data-through-a-lossless-audio-decoder.md)
