<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Carry hidden caption state across packet-copy cuts

Full identity: `R315.carry-hidden-caption-state-across-packet-copy-cuts`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current subtitle bridge consumes already-rendered bitmap snapshots; NativeASS handles external ASS. No controlled CEA608 parser/logical state capsule restore owner exists. Visible bitmap/text snapshots cannot preserve hidden pop-on state.

Next action: Define versioned logical CEA608 state and one cut between hidden write/EOC; compare entire suffix and reject visible-text-only, repeated-EOC or wrong-service/source capsule.

## Definition and contract

Type: Caption-aware editing and seek capability; not a new video decoder. Mechanism. At each selected clip boundary, compile the original stateful caption history into a versioned logical-state capsule. Attach that application sidecar to the fragment recipe. Restore the caption decoder before continuing the selected source's subsequent caption events, while the audio/video route retains its independently qualified packet-copy or native construction. Source basis. FFmpeg's real-time CEA-608 path has displayed and non-displayed screen state. Pop-on writing can target the inactive screen and an end-of-caption command swaps screens. Cursor, style, mode, and repeated-command handling also affect subsequent output. A snapshot of only the visible text is insufficient. [S5]

Output contract: Independent rendering or browser-owned reference appropriate to the same contract, including hidden state, timing, ordering and clear events.

Primary metric: Required caption capability or total render/extraction cost and retained cue/atlas memory.

Adverse control: Seek into an active cue, change fonts/layout/source, or omit a required style/control. No silent simplification or stale overlay.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R315.carry-hidden-caption-state-across-packet-copy-cuts.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R315.carry-hidden-caption-state-across-packet-copy-cuts.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R313-R317-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R313-R317-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R315.carry-hidden-caption-state-across-packet-copy-cuts.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R315.carry-hidden-caption-state-across-packet-copy-cuts.md)
