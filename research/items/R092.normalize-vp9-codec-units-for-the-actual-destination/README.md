<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Normalize VP9 codec units for the actual destination

Full identity: `R092.normalize-vp9-codec-units-for-the-actual-destination`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled actual existing aggregate/split VP9 superframe test against unchanged worker and fixture identities: six hidden frames retained, 72 exact visible frames/timestamps, seek passes, missing-hidden oracle and cold-dependent-start fail. Destination-specific normalized framing works; generic split policy not justified.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Question. Are some rejected or inefficient pipelines a framing mismatch rather than an unsupported codec? What differs from earlier work. Distinct from temporal-layer removal: preserve every coded dependency while changing packet grouping or superframe framing. Input scope. VP9 streams containing hidden reference frames and superframes; fixed codec profile first. Mechanism to test. Inspect codec frame boundaries and use lossless superframe split/merge operations where the target container or codec API requires them. Smallest experiment. 1. Prepare equivalent VP9 single-frame and superframe representations using a pinned bitstream filter. 2. Feed each destination only its defined chunk/sample format; test muxed media and WebCodecs separately. 3. Compare against full ordered decode, including hidden-frame dependencies and seeking.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R092.normalize-vp9-codec-units-for-the-actual-destination.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R092.normalize-vp9-codec-units-for-the-actual-destination.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R092.normalize-vp9-codec-units-for-the-actual-destination.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R092.normalize-vp9-codec-units-for-the-actual-destination.md)
- [results/full-completion/r332/result.json](../../../results/full-completion/r332/result.json)
