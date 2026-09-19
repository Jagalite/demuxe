<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# scoped transport-clock normalization

Full identity: `R220.scoped-transport-clock-normalization`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_HANDLED_PROFILE** (top100).

Authored raw PES/PCR rollover across33-bit boundary already unwraps consistently through demux; selected packet payload and A/V offsets preserved. Existing RemuxPlayer plays/seeks with exact host decoded pixels/PCM. Bounded late-reorder policy and large-jump refusal pass; no second normalizer should be inserted after authoritative demux.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

The model uses a 33-bit 90 kHz modulus and permits automatic epoch selection only when exactly one candidate timestamp lies inside a bounded ±2-second continuity/reordering window. Explicit discontinuities reset the scope. It passed forward rollover, a late reordered packet straddling rollover, explicit discontinuity, ordinary monotonic timing, and an A/V pair whose 45,000-tick (0.5 s) offset remained unchanged. An unmarked large discontinuity and a roughly half-modulus jump were refused rather than silently normalized. This validates the policy model. It is not yet wired into a real MPEG-TS parser.

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
| decision | passed | Historical decision imported verbatim: ALREADY_HANDLED_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R220.scoped-transport-clock-normalization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R220.scoped-transport-clock-normalization.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R220.scoped-transport-clock-normalization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R220.scoped-transport-clock-normalization.md)
- [results/top100/clock/browser-result.json](../../../results/top100/clock/browser-result.json)
- [results/top100/clock/result.json](../../../results/top100/clock/result.json)
