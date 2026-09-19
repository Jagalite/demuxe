<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 large-scale tile viewport decode

Full identity: `R275.av1-large-scale-tile-viewport-decode`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (top100).

No matching aomenc/aomdec tile-selection build or genuine AV1 large-scale-tile fixture available. Full-frame AV1 decoding/cropping would not test sparse tile work. Requires dedicated libaom prepared fixture and selected-tile oracle; not browser codec rejection.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

A controlled 512×512 AV1 keyframe was encoded as a prepared 2×2 large-scale-tile representation. The libaom decoder was then asked for one tile at row 1, column 1. The returned 256×256 tile matched all 65,536 Y samples of the corresponding bottom-right quadrant from a full-frame decode: zero differences. The selected coded tile was 10,126 bytes out of a 40,300-byte frame (25.13%). Across 12 host runs, full decode median was 7.144 ms and selected-tile decode median 1.565 ms, a 4.57× ratio. This is strong evidence for a prepared viewport representation and a decoder capable of tile selection. It is not evidence that arbitrary AV1 can be sparsely decoded, nor a browser/GPU performance claim.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R275.av1-large-scale-tile-viewport-decode.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R275.av1-large-scale-tile-viewport-decode.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R275.av1-large-scale-tile-viewport-decode.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R275.av1-large-scale-tile-viewport-decode.md)
- [results/top100/prerequisites/media-inventory.json](../../../results/top100/prerequisites/media-inventory.json)
