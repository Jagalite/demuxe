<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# coded-sample identity across containers

Full identity: `R227.coded-sample-identity-across-containers.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current cache keys are per-source byte offsets and FFmpeg copies selected packet payloads; no container-independent immutable sample cache exists. Equal AVC hashes across MP4/MKV do not identify common timestamps, codec config, color or authorization.

Next action: Define one canonical packet object key across two authorized containers and compare payload/config identity with a changed-color or timing control.

## Definition and contract

A 150-packet AVC stream was encoded once in MP4 and stream-copied to Matroska. Every packet has the same payload size and SHA-256 in both containers. The first packet hash is SHA256:de4472b3c0e949b4f79e3a6a66dfbd8e925e97ea2d63e033a1287505875f6201. That supports making a prepared/cache object container-independent at the coded-sample layer when decoder configuration, dependency boundaries, color/output semantics and authorization also match. It does not imply the surrounding MP4/MKV bytes, timestamps, cue structures, or decoder configuration records are interchangeable.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R227.coded-sample-identity-across-containers.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R227.coded-sample-identity-across-containers.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R227.coded-sample-identity-across-containers.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R227.coded-sample-identity-across-containers.report-continuity.md)
