<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract an AV1 operating point before decoding

Full identity: `R239.extract-an-av1-operating-point-before-decoding.report-a`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current AV1 path copies complete packets; no operating-point OBU parser exposes layer dependencies or a lower-cadence permission. Historical exact extraction is strongly fixture-scoped and required real SVC authoring.

Next action: For explicitly requested lower cadence, use the identified SVC fixture and verify retained OBU/timestamp/picture identity with missing-base and truncated OBU controls.

## Definition and contract

The lab driver uses the installed libaom SVC API to author a real 160×96, 120-frame, 60 fps AV1 sequence with one spatial layer and three temporal layers. Actual frame OBU counts were 30 at temporal ID 0, 30 at ID 1, and 60 at ID 2. The encoder produced operating-point masks 0x107, 0x103 and 0x101. A fixture-scoped parser extracts temporal ID 0, retains its coded frame OBUs, and rewrites the sequence header to advertise one available operating point. The IVF timing is changed from 60 ticks/second with every fourth picture retained to 15 ticks/second with sequential picture indices; presentation timestamps remain the same. The picture payload is not decoded and re-encoded by the extractor. This is not a general-purpose parser for arbitrary AV1 headers.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R239.extract-an-av1-operating-point-before-decoding.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R239.extract-an-av1-operating-point-before-decoding.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R239.extract-an-av1-operating-point-before-decoding.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R239.extract-an-av1-operating-point-before-decoding.report-a.md)
