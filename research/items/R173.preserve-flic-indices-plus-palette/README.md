<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# preserve FLIC indices plus palette

Full identity: `R173.preserve-flic-indices-plus-palette`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual two-frame FLC with palette-only second update renders exact independent RGBA through index+palette GPU textures. Restricted COLOR256/COPY chunks establish representation feasibility; other FLIC opcodes and seek checkpoints remain future work.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

The controlled 16×8 FLC has four meaningful state transitions: initial palette+indices, palette-only, index-only, then another combined update. A small state machine preserves the 128-byte index plane and 768-byte palette separately. Expanding that state to RGB matches FFmpeg exactly for all frames, including the palette-only update. Replaying state from the beginning to the seek target reproduces the same RGB hash. This validates palette/index retention and the seek-state requirement. Browser shader lookup remains untested because the environment exposes no WebGL/WebGPU context. Integration implication: this is a legitimate indexed-image route only if palette state is part of the seek dependency graph. Palette-only packets are presentation-significant even when index bytes do not change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R173.preserve-flic-indices-plus-palette.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R173.preserve-flic-indices-plus-palette.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R173.preserve-flic-indices-plus-palette.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R173.preserve-flic-indices-plus-palette.md)
- [results/top100/gpu/input.json](../../../results/top100/gpu/input.json)
- [results/top100/gpu/result.json](../../../results/top100/gpu/result.json)
