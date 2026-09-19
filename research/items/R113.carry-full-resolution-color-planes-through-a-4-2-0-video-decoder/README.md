<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Carry full-resolution color planes through a 4:2:0 video decoder

Full identity: `R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current decoded YUV mapping assumes ordinary image planes and no carrier-atlas interpretation/profile exists. New prepared three-width luma atlas and shader require explicit contract and range oracle.

Next action: Create one trusted all-byte ramp carrier and decode-plane oracle, then exact atlas shader nearest lookup; reject clipping/neutral-chroma conversion changes and count larger coded surface/preparation.

## Definition and contract

Type: Prepared representation experiment. Priority: P2. Question. Can a commonly admitted decoder preserve fine color detail that a conventional 4:2:0 representation loses? What differs from earlier work. R80 reconstructed alpha/HDR auxiliaries and R98 packed separate views. Here one image is represented as full-resolution component planes placed in the carrier luma image. Mechanism. Extract source 4:4:4 Y/Cb/Cr planes, arrange them in separate regions of one grayscale luma atlas, encode a supported 4:2:0 carrier with neutral chroma, then reconstruct the original planes in a shader. Initial source profile. Prepared small 8-bit 4:4:4 test charts and text first; explicit range/transfer definitions and no claim of direct reuse of an arbitrary existing bitstream.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R102-R115-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R102-R115-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md)
