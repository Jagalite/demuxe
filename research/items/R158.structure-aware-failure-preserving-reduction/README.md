<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Structure-aware failure-preserving reduction

Full identity: `R158.structure-aware-failure-preserving-reduction`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_AS_TEST_TOOL** (full-completion).

Reducing 49 Xiph lace groups to one retains the identical Chrome CHUNK_DEMUXER_ERROR_APPEND_FAILED / Lacing 1 unsupported predicate; unlaced control plays to EOF with 880Hz audio. Independent packet hashes and PTS match across variants. Worth a structure-aware failure reducer; this controlled fixture reduction is not a generic reducer implementation.

Next action: Specify one concrete wrong-output or provenance failure the proposed tool must detect beyond the existing harness.

## Definition and contract

Used the previously supplied R110 laced-Opus WebM as an explicitly known incompatibility, then independently reran it in the current browser. The predicate requires: host parsing still yields audio packets; MSE rejects the laced candidate; and the corresponding unlaced candidate is accepted. The reducer rewrites valid EBML lengths and removes irrelevant metadata and groups while retaining the target condition. Seven accepted predicate probes reduce 46,580→1,238 bytes, and 50→1 laced block, containing three original codec packets. The minimized file still decodes through the direct browser path. Laced and unlaced minimized files produce identical, nonempty host PCM. This is a reproducible reducer result, not a new browser vulnerability, a globally byte-minimal testcase, or support for arbitrary codec-aware reduction. Positive-control preservation prevents confusing a generic broken file with the targeted destination distinction.

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE_AS_TEST_TOOL. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R158.structure-aware-failure-preserving-reduction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R158.structure-aware-failure-preserving-reduction.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R158.structure-aware-failure-preserving-reduction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R158.structure-aware-failure-preserving-reduction.md)
- [results/full-completion/webm-boundaries/lace-identity.json](../../../results/full-completion/webm-boundaries/lace-identity.json)
- [results/full-completion/webm-boundaries/lacing-result.json](../../../results/full-completion/webm-boundaries/lacing-result.json)
- [results/full-completion/webm-boundaries/one-lace-identity.json](../../../results/full-completion/webm-boundaries/one-lace-identity.json)
