<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Select or assemble whole Opus elementary streams without PCM

Full identity: `R104.select-or-assemble-whole-opus-elementary-streams-without-pcm`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Whole-track Opus packaging exists but selected component streams and family255 mapping are not exposed; current adaptation is mono/stereo. A self-delimiting component parser plus truthful layout/trim contract is needed.

Next action: Extract one entire independent mono component and one coupled pair from a marked fixture, compare payload/PCM and reject half-pair selection or mismatched pre-skip.

## Definition and contract

Question. Can a multistream Opus asset expose a selected independent stream, or can aligned streams be assembled into a supported multichannel presentation without re-encoding? What differs from earlier work. R93 changed temporal packet grouping. This changes which independently coded mono/stereo streams are carried and how their channels are mapped. Mechanism. Parse self-delimiting component packets, retain chosen whole elementary streams, and author the new multistream framing and channel mapping. Initial source profile. Known channel mapping; complete mono streams or coupled stereo pairs; matching time origin, pre-skip, effective output gain and per-packet duration. Source basis. The Ogg Opus mapping places equal-duration component Opus packets in one logical packet, with explicit stream/channel mapping. [S2]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md)
