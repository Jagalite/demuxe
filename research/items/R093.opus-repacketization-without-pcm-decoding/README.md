<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Opus repacketization without PCM decoding

Full identity: `R093.opus-repacketization-without-pcm-decoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current packet-copy mux preserves packet boundaries; no Opus repacketizer owns grouping or compatible mode transitions. Historical exact PCM is promising but output packet reduction trades against arrival latency rather than meaningful file savings.

Next action: Add an isolated host/component repacketizer for one existing 20ms source, split grouped 40/60ms packets back, and compare exact trim plus configuration-change rejection.

## Definition and contract

Question. Can packet overhead and submission frequency be traded against availability latency without re-encoding audio? What differs from earlier work. Not MSE append batching: changes the codec packet grouping itself while preserving the constituent encoded frames. Input scope. Elementary Opus with compatible mode, bandwidth, frame size and channels; no generalized multistream claim. Mechanism to test. Group existing compatible frames into fewer packets or split a previously grouped packet back into its existing constituent frames. Smallest experiment. 1. Compare existing 20 ms frames in 20/40/60 ms packet groupings. 2. Split a valid multi-frame packet back to the original frame granularity. 3. Mux each form and compare browser and reference-decoder outputs, startup and seek behavior.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R093.opus-repacketization-without-pcm-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R093.opus-repacketization-without-pcm-decoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R093.opus-repacketization-without-pcm-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R093.opus-repacketization-without-pcm-decoding.md)
