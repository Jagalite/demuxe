<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode directly at reduced resolution for explicit previews

Full identity: `R064.decode-directly-at-reduced-resolution-for-explicit-previews`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

No preview/economy decode policy exists; software decoder options only set resource bounds. Lowres is codec-specific and intentional quality change, not permission from small display size.

Next action: Once explicit preview intent exists, query compiled MJPEG/MPEG2 max_lowres and compare one frame with full-decode scaling; unsupported codec must retain full decode and report pixel differences.

## Definition and contract

New preview/economy decoder policy · P2 · Risk: Medium · PROPOSED / NOT TESTED First environment: Host FFmpeg decoder experiment plus sandbox presentation; verify actual installed lowres support first. Related cards: R55. Proposed mechanism. For preview thumbnails or an explicitly requested reduced-detail mode, use a decoder’s supported lowres path instead of reconstructing a full frame and then scaling it down. Never infer permission merely from a small CSS video element. What is new. R55 cached completed previews; this reduces work on a cache miss. It is also distinct from a cheaper presenter, because reconstruction resolution changes inside the decoder. Source basis. FFmpeg exposes decoder-specific max_lowres, and its versioned MJPEG and MPEG-2 decoder declarations advertise support. This is not a general H.264, HEVC or AV1 facility, nor proof of equal-quality results. [F3, F4, F5]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R58-R69-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R58-R69-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md)
