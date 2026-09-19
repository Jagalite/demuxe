<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play an exact requested excerpt without re-encoding its edge GOP

Full identity: `R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Seek already supplies preroll and checks covering frames, but public exact interval end/audio suppression contract is missing. Partial packet slicing alone cannot promise no preroll audio or exact end.

Next action: Define one [3.35,7.65) playback-range contract then test bounded input against full source; appendWindowStart that removes required edge GOP is the intentional failing control.

## Definition and contract

New bounded-clip session candidate · P2 · PROPOSED / NOT TESTED Extends: R09, R37, R40. Reference primitives: S1, S4, S9. Question. Can an excerpt beginning between keyframes start correctly using only nearby original media, instead of re-encoding its first frames or preparing the whole source? Mechanism. Separate decoder preroll from the public visible interval. Supply the preceding random-access data, map source time explicitly, and seek the candidate to the requested start before presentation. Keep one A/V owner. Smallest useful experiment. Use an H.264 B-frame clip with two-second GOPs, AAC or FLAC audio and burned frame IDs. Request [3.35, 7.65) seconds. Compare full-source seek with a bounded indexed input window. Verify pause, replay, final-frame coverage and cancellation. Include a deliberately broken control that filters away needed preroll with appendWindowStart.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md)
