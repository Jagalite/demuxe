<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer explicit compatible-core extraction before audio re-encoding

Full identity: `R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current finite plans preserve requested audio or explicitly allow lossy encoding; no separate permission represents discarding compatibility extensions. DTS core is not automatically browser-supported, so extraction alone does not establish a usable route.

Next action: Identify one true core-plus-extension fixture and explicitly permitted core output, then query/decode that exact core destination before adding a dca_core path.

## Definition and contract

Packaging · New fidelity-option hypothesis · P3 · Risk: High First environment: Host FFmpeg + browser; Wasm later. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. For streams with a real independently decodable compatibility core, test packet-level core extraction only when the target can play that core and the application permits discarding extensions. This avoids adding an encoder but is not full-fidelity preservation. Source basis. FFmpeg documents dca_core as extracting DTS core while dropping extensions such as DTS-HD. It does not turn DTS into a codec that every browser supports. [F2] First agent experiment. Use an actual core-plus-extension fixture, preserve video, identify what was discarded and probe the exact extracted codec/container. Compare complete output requirements and cost with decode/adapt or Hybrid.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md)
