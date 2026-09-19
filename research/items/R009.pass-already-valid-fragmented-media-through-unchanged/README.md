<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Pass already-valid fragmented media through unchanged

Full identity: `R009.pass-already-valid-fragmented-media-through-unchanged`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Reconciled completed prior evidence: Existing local fMP4 opens and seeks as native-direct in the preserved opportunities-02 result. This is a cheaper correct route for the tested file profile than a new MSE parser. It does not implement or reject controlled-fetch/track-selective pass-through.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Packaging · New fast-path hypothesis · P2 · Risk: Medium First environment: Host fixture server + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. For existing fMP4 presentations, recognize valid initialization/media units and append them unchanged instead of demuxing and remuxing every sample. Limit the first implementation to matching track selection, configuration and timeline. Source basis. MSE consumes initialization and media segments; Chromium’s parser reads moov/moof/sample data. FFmpeg can produce self-relative fragmented layouts. [M1, C2, F1] First agent experiment. Compare pass-through with maintained remux on the same fMP4 file/segments. Verify config, track IDs, offsets and payloads. Include nonzero starts, selected-track mismatch and encrypted input as rejection controls.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R009.pass-already-valid-fragmented-media-through-unchanged.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R009.pass-already-valid-fragmented-media-through-unchanged.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/opportunities-02.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/opportunities-02.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R009.pass-already-valid-fragmented-media-through-unchanged.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R009.pass-already-valid-fragmented-media-through-unchanged.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
