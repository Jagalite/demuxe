<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Interpolation guided by real codec motion vectors

Full identity: `R157.interpolation-guided-by-real-codec-motion-vectors`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current bridge exposes decoded pictures but not codec motion-vector side data, and ordinary playback does not request synthetic intermediate pictures. Historical cut control is worse than frame hold, rejecting universal guided-interpolation quality from average errors.

Next action: For requested interpolation, first expose real vectors and compare cut/occlusion cases separately against hold/blend and independent ground truth.

## Definition and contract

Used actual MPEG-2 I/P decoder-exported AVMotionVector side data, not the fixture’s known motion as the algorithm input. Native FFI output pixels are independently matched to FFmpeg CLI output. Missing vectors use zero-motion blending; vector-guided bilinear warps construct midpoint pictures. Original 30 fps synthetic frames provide ground truth while the coded input contains every other frame [S8, S9]. The interval crossing the scene cut is a clear counterexample: guided error 54.44/255, blend 53.28/255, previous-frame hold 32.83/255. Averages over mostly translating frames must not conceal that failure. Scene-cut/occlusion decisions and disoccluded-region synthesis remain necessary before a robust interpolator could be claimed.

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R157.interpolation-guided-by-real-codec-motion-vectors.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R157.interpolation-guided-by-real-codec-motion-vectors.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R157.interpolation-guided-by-real-codec-motion-vectors.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R157.interpolation-guided-by-real-codec-motion-vectors.md)
