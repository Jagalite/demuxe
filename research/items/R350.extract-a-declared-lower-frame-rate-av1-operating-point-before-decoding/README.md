<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract a declared lower-frame-rate AV1 operating point before decoding

Full identity: `R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_FIXTURE_SETUP** (top100).

Actual local low-delay hierarchical SVT encode was inspected: only one operating point,idc0, no OBU extension temporal IDs. It is not a genuine selectable lower-rate operating-point fixture. Need matching layered encoder/source before meaningful extraction; no negative claim about AV1 mechanism.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Investigate a source-native lower-frame-rate mode for a genuinely temporally scalable AV1 stream. The AV1 specification defines operating-point masks and layer-based OBU dropping. [S6, S7] Candidate: validate the selected advertised operating point, retain its required OBU payloads and global configuration, normalize the advertised configuration only where needed, construct legal output framing, and decode the extracted stream. This uses an existing independently decodable temporal subset instead of decoding everything and discarding displayed outputs afterward. One spatial layer, two temporal layers, stable dimensions and bit depth, closed qualified starting points, no decoder-model timing fields in the first header-normalization pilot, and an authored base temporal layer. For example, a fixture may offer 60 and 30 presentation instants per second. Those numbers are fixture choices, not claims about arbitrary AV1 files.

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
| decision | passed | Historical decision imported verbatim: DEFER_FIXTURE_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md)
- [results/top100/prerequisites/av1-encoder.log](../../../results/top100/prerequisites/av1-encoder.log)
- [results/top100/prerequisites/av1-result.json](../../../results/top100/prerequisites/av1-result.json)
