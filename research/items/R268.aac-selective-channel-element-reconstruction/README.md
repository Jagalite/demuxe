<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AAC selective channel-element reconstruction

Full identity: `R268.aac-selective-channel-element-reconstruction`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

AAC initialization is parsed for muxing, but element-level SCE dependency admission/rewriting is not implemented. Whole audio-track selection is not independent channel-element selection; arbitrary CPE/SBR tools cannot inherit the six-SCE result.

Next action: Use one independent-SCE AAC fixture to select element4 and compare full source-channel PCM, rejecting CPE, SBR, prediction and coupling.

## Definition and contract

Six independently encoded mono AAC-LC streams were assembled as six coded channel elements in a 5.1 program configuration. The test deliberately excludes the dependencies that would invalidate independent reconstruction: no SBR, prediction, coupling, or coupled stereo element is admitted. The selector requested source element 4 (631 Hz), parsed and retained that one coded SCE, and skipped five other coded elements in every one of 48 AAC frames. It did not reconstruct PCM during selection. The resulting mono AAC decoded to 49,152 samples that were bit-for-bit identical both to the original mono source and to the matching channel from the complete six-channel decode. This establishes a real compressed-domain channel-selection primitive for admitted independent SCEs. It does not justify selecting one half of a CPE or bypassing cross-element dependencies.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R268.aac-selective-channel-element-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R268.aac-selective-channel-element-reconstruction.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R268.aac-selective-channel-element-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R268.aac-selective-channel-element-reconstruction.md)
