<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Tune WebM cluster production for early audio availability

Full identity: `R054.tune-webm-cluster-production-for-early-audio-availability`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Actual two-second VP9/Opus output releases two roughly one-second clusters and retains all packets/trim. It does not expose an expensive long-GOP withholding case. A cluster-policy rebuild and representative long-GOP trace are needed before choosing smaller clusters; no negative policy experiment was run.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

New container-specific delivery experiment · P2 · PROPOSED / NOT TESTED Extends: R04, R32, R34. Reference primitives: S3, S6, L3, E1. Question. Does the working mixed-container route become more useful when Opus WebM bytes are emitted incrementally by the actual producer? Mechanism. Vary only a few supported WebM cluster-time/size and flush choices, keeping the same Opus packets and source timeline. Distinguish bytes FFmpeg has emitted from a prebuilt file artificially dripped into MSE. Smallest useful experiment. Feed existing Opus packets through a native FFmpeg pipe with default and bounded cluster policies. Record actual byte-release times, then append alongside identical fMP4 video. Test startup, delayed delivery, cancellation and EOF. First prove packet count, delay and tail equivalence for every candidate.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R054.tune-webm-cluster-production-for-early-audio-availability.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R054.tune-webm-cluster-production-for-early-audio-availability.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R054.tune-webm-cluster-production-for-early-audio-availability.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R054.tune-webm-cluster-production-for-early-audio-availability.md)
- [results/full-completion/continuity/maintained-webm-result.json](../../../results/full-completion/continuity/maintained-webm-result.json)
- [results/full-completion/webm-boundaries/metadata.json](../../../results/full-completion/webm-boundaries/metadata.json)
