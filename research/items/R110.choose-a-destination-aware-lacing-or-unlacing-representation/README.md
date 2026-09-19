<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Choose a destination-aware lacing or unlacing representation

Full identity: `R110.choose-a-destination-aware-lacing-or-unlacing-representation`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_IMPLEMENTED** (top100).

Reconciled completed prior evidence: Chrome rejects Xiph-laced Opus; current actual Wasm remux emits a playable representation with all 101 packet payloads, exact decoded PCM and 648-sample final trim preserved. Seek and cleanup pass. Preserve this existing normalization and add regression coverage; no new unlacing subsystem needed for this profile.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Type: Container-specific routing. Priority: P2. Question. Can the same coded audio use compact native-file packaging or a minimal MSE-compatible rewrite, depending on its parser? What differs from earlier work. R93 repacketized codec frames inside Opus packets. Lacing groups already distinct codec packets only at the container level. Mechanism. Compare bounded Matroska/WebM audio lacing for a direct-file route against an unlacer that emits separate blocks for an MSE route without changing codec packets. Initial source profile. Small contiguous same-track audio packets with known durations. No lacing across discontinuities or configuration changes. Source basis. Matroska defines lacing. The reviewed Chromium main WebMClusterParser explicitly rejects it, so MSE lacing is not proposed as a supported fast path. Direct-file behavior remains a runtime probe. [S10, S11]

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
| decision | passed | Historical decision imported verbatim: ALREADY_IMPLEMENTED. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md)
- [results/full-completion/webm-boundaries/lacing-result.json](../../../results/full-completion/webm-boundaries/lacing-result.json)
- [results/full-completion/webm-boundaries/maintained-lace-result.json](../../../results/full-completion/webm-boundaries/maintained-lace-result.json)
