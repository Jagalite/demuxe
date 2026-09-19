<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Mux color and alpha into native transparent WebM

Full identity: `R097.mux-color-and-alpha-into-native-transparent-webm`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Mux-only reconstruction of suitable aligned VP8 color/alpha packet pairs preserves complete host RGBA and native transparency through seek, rewind and EOF. Mispaired timestamp rejects. Color/mask source preparation cost remains separate; no hardware alpha claim.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Question. Can an existing pair of suitable compressed visual streams become native transparent video without custom per-frame reconstruction? What differs from earlier work. Extends R80 but delegates synchronization/reconstruction to the native container path instead of two independent video elements and a custom shader. Input scope. Initially compatible aligned VP8 color and alpha-plane streams; dimensions, timestamps and dependency boundaries validated. Mechanism to test. Package coded color in Block and the aligned coded alpha plane in BlockAdditional, then present through a native video element. Smallest experiment. 1. Prepare a color/mask pair with sharp edges and smooth alpha gradients. 2. Mux without re-encoding the already compatible streams. 3. Compare native transparency against a two-stream shader reference; probe VP9 as a separate profile.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R097.mux-color-and-alpha-into-native-transparent-webm.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R097.mux-color-and-alpha-into-native-transparent-webm.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R097.mux-color-and-alpha-into-native-transparent-webm.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R097.mux-color-and-alpha-into-native-transparent-webm.md)
- [results/top100/alpha/fixture.json](../../../results/top100/alpha/fixture.json)
- [results/top100/alpha/result.json](../../../results/top100/alpha/result.json)
