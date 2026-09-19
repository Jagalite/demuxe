<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile G.711 processing chains into exact lookup tables

Full identity: `R310.compile-g-711-processing-chains-into-exact-lookup-tables`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Pinned G711 already uses conversion maps; current native adaptation does not admit a G711 process/reencode operation. Historical host-process ratios are not an optimized fused baseline, and there is no current fixed telephony recipe to compile.

Next action: Reopen for a concrete fixed G711 chain and enumerate every code/pair against independent fused implementation with changed-parameter invalidation.

## Definition and contract

Class: Exact finite-input-domain processing specialization. Output contract: Byte-identical output to one fully pinned decode/process/re-encode recipe; the requested processing and companding may intentionally alter samples. Related: R292 specializes decoding code; this specializes the whole stateless processing chain. G.711 PCMA/PCMU encode a sample in one octet [S5]. FFmpeg exposes A-law/mu-law conversion functions and conversion tables, so ordinary table-based decoding must be part of the baseline [S6]. For a fixed samplewise operation P and pinned decode/encode maps D and E, compile: For two aligned inputs and a fixed mix-plus-nonlinearity recipe Q: There are 256 input values in the first case and 65,536 pairs in the second. An eight-bit-output two-input table occupies 64 KiB. A two-input table can replace explicit decode, mixing, memoryless clipping/processing, and re-encoding steps at runtime.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md)
