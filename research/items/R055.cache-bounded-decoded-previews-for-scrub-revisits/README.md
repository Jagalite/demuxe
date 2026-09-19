<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache bounded decoded previews for scrub revisits

Full identity: `R055.cache-bounded-decoded-previews-for-scrub-revisits`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

UI seek-preview means visibility of controls, not generated image previews. No requested thumbnail producer/cache exists; adding a second decoder merely to measure cache hits exceeds first-pass scope.

Next action: Specify eight-image/byte-capped approximate preview API and source/time key; evaluate one reverse gesture only after producer exists, rejecting late old-source capture.

## Definition and contract

New preview-only route candidate · P2 · PROPOSED / NOT TESTED Extends: R40, R45. Reference primitives: S4, S10, L3. Question. Can reverse scrubbing and repeated hover previews reuse recently decoded preview images instead of repeatedly seeking a decoder? Mechanism. Maintain a small explicitly approximate preview cache keyed by source, video selection, presentation geometry and source time. Capture only requested preview frames; do not read back every normal playback frame. Smallest useful experiment. Use a separate muted preview element on a compatible source or captures already produced for requested previews. Replay one-way and back-and-forth gesture traces with and without an eight-image/byte cap. Test source replacement and a late capture from a canceled preview.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R055.cache-bounded-decoded-previews-for-scrub-revisits.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R055.cache-bounded-decoded-previews-for-scrub-revisits.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R055.cache-bounded-decoded-previews-for-scrub-revisits.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R055.cache-bounded-decoded-previews-for-scrub-revisits.md)
