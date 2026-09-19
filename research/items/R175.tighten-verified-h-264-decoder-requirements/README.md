<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# tighten verified H.264 decoder requirements

Full identity: `R175.tighten-verified-h-264-decoder-requirements`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current SPS reading establishes dimensions/reorder contract and preserves truthful configuration. It does not inspect every slice/reference operation to certify a lower advertised DPB requirement; changing SPS optimistically would weaken admission.

Next action: Audit one overstated progressive I/P stream across every reference-list operation, then rewrite only num_ref_frames with exact frame hashes and a hidden extra-reference negative.

## Definition and contract

The fixture is progressive H.264 with 60 frames: 2 I and 58 P, no B pictures, one actual active reference, and no list-0 reordering flags. An intentionally overstated SPS advertises eight reference pictures. The corrected stream advertises one. Decoded frame-MD5 sequences are identical. Slice payloads are unchanged outside the SPS, and the MP4 muxed timestamps/frame types are identical for all 60 frames. Integration implication: Demuxe may safely lower advertised requirements only after deriving a certificate from actual bitstream behavior. This is not permission to rewrite arbitrary SPS constraints optimistically.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R175.tighten-verified-h-264-decoder-requirements.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R175.tighten-verified-h-264-decoder-requirements.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R175.tighten-verified-h-264-decoder-requirements.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R175.tighten-verified-h-264-decoder-requirements.md)
