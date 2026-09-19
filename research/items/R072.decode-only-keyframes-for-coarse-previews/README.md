<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode only keyframes for coarse previews

Full identity: `R072.decode-only-keyframes-for-coarse-previews`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

No maintained coarse-preview service or explicit skip_frame policy exists. Historical host hashes/CPU support a coarse-only experiment, not a browser result or permission to alter playback decoding.

Next action: Define one source-scoped coarse preview job and use existing decode harness only after that API exists; open-GOP/non-key request must not masquerade as exact seek.

## Definition and contract

Question. When the requested output is a sparse keyframe storyboard, can non-keyframe reconstruction be skipped? This is different from R64's reduced-resolution reconstruction and R55's preview caching. The documented skip_frame=nokey control discards non-keyframes. It does not provide arbitrary exact-frame access. [F2] The reference fully decodes a 12-second 1280×720 H.264 fixture, selects its I frames and scales them to 320×180. The candidate decodes keyframes only and uses the same scaler. The fixture has a closed 60-frame GOP, B frames and no scene-cut keyframes; the selected frames are 0, 60, 120, 180, 240 and 300. All six resized-frame hashes and complete frame records match. Median CPU is 828.87 → 101.55 ms; wall time is 464.74 → 96.39 ms. The candidate does less temporal work without changing these selected images in this fixture.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R072.decode-only-keyframes-for-coarse-previews.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R072.decode-only-keyframes-for-coarse-previews.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R072.decode-only-keyframes-for-coarse-previews.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R072.decode-only-keyframes-for-coarse-previews.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
