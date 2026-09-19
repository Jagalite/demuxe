<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make streaming representation choices aware of complete-plan feasibility

Full identity: `R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

chooseVariant uses explicit representation or bandwidth while planAdmission separately enforces complete playback requirements. There is a genuine compatibility-policy separation, but current bounded manifest selection is not a qualified dynamic ABR owner; per-track invalidation requires a larger streaming transition contract.

Next action: Audit one two-rendition manifest selection against complete-plan facts before introducing runtime switching; retain explicit representation intent.

## Definition and contract

Streaming · New integration hypothesis · P2 · Risk: High First environment: Qualified streaming implementation required. Dependencies: R15. Status: Untested hypothesis. Proposed mechanism. Let the existing adaptive controller consider whether a rendition preserves a qualified browser-owned plan and requested HDR/audio/subtitles, not bandwidth alone. Invalidate only affected track/configuration state rather than rebuilding unrelated video or audio. Source basis. MSE supports configuration changes, while WebCodecs support is configuration-specific. These are primitives; neither supplies Demuxe’s adaptive policy. [M1, W1] First agent experiment. After the streaming baseline is qualified, use equivalent-role renditions with different codec/configuration requirements. Compare existing adaptation policy with compatibility-aware selection and per-track invalidation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md)
