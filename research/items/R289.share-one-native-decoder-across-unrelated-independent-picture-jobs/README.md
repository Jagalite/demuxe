<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share one native decoder across unrelated independent-picture jobs

Full identity: `R289.share-one-native-decoder-across-unrelated-independent-picture-jobs`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Decoder is scoped to one player generation, and the UI has no independent picture-job service. Cross-source jobs need full-configuration grouping and job/output correlation, beyond a localized playback patch.

Next action: Define one three-IDR job API and compare persistent decoder/pool with same-config sources; duplicate source timestamps plus canceled middle job must not swap output identities.

## Definition and contract

Mechanism. An active WebCodecs worker accepts independently decodable pictures from multiple authorized files, groups only compatible full decoder configurations, and correlates each output with a job identity. Preserve the original source timestamps and display metadata separately from internal dispatch timestamps. This is a thumbnail/inspection service, not interleaving arbitrary predictive streams or sharing live playback state. Begin with H.264 IDR-only inputs and matching parameter sets, geometry, bit depth, color interpretation, and benign prior-output semantics. First experiment. Request one independently decodable picture from each of several synthetic files. Compare one persistent service, per-job decoder construction, and a small bounded decoder pool. Do not wait to fill a batch or delay an interactive job purely for utilization. Include cancellation, duplicate original timestamps, configuration changes, a failed input, and stale outputs after a generation change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R289-R294-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R289-R294-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md)
