<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# A small JavaScript ordinary-MP4-to-MSE adapter

Full identity: `R046.a-small-javascript-ordinary-mp4-to-mse-adapter`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Strict bounded JavaScript sample-table adapter preserves all tested packet timing/payload and full decoded output; actual MSE marked A/V reaches EOF. Further profiles need B-frame/tail-moov and edit-list variation.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New deployment/packaging candidate · P1 · PROPOSED / NOT TESTED Extends: R06, R09. Reference primitives: S2, S3, S10. Question. Can a tightly scoped MP4 preparation route avoid downloading or compiling a Wasm muxer when controlled MSE playback is needed? Mechanism. Parse the selected ordinary-MP4 sample tables in JavaScript and construct small fMP4 headers around the unchanged compressed samples. This differs from R09, which only forwards media that is already fragmented. Smallest useful experiment. Start with unencrypted, fixed-configuration H.264/AAC MP4: one video and one selected audio track. Support the fixture’s actual timing/priming or reject it. Compare output with host-FFmpeg packet-copy fragmentation, then add B-frame composition offsets, a tail moov and malformed-size controls. Do not expand into a general demuxer.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md)
- [results/top100/destinations/result.json](../../../results/top100/destinations/result.json)
- [results/top100/mp4/result.json](../../../results/top100/mp4/result.json)
