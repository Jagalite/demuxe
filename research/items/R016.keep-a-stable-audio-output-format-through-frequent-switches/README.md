<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep a stable audio output format through frequent switches

Full identity: `R016.keep-a-stable-audio-output-format-through-frequent-switches`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Audio track switch currently restarts remux at the existing position; FLAC output preserves source rate/layout rather than enforcing a stable session configuration. A persistent audio producer and permitted common profile are needed, especially where native tracks differ.

Next action: Trace one pair of compatible integer tracks through current switch and measure interruption before designing one stable FLAC producer boundary.

## Definition and contract

Timeline · New tradeoff hypothesis · P2 · Risk: High First environment: Host FFmpeg + browser; Wasm later. Dependencies: R15. Status: Untested hypothesis. Proposed mechanism. For an explicitly requested multilingual/session use case, compare copying each selected track against converting compatible integer tracks to one stable FLAC rate/layout/configuration. The aim is fewer destination reconfigurations, not less encoding. Source basis. FLAC has explicit stream properties, and MSE has reconfiguration boundaries. Stable output is a proposed policy; it is not proof that a browser keeps the same decoder instance. [F5, M1] First agent experiment. Compare repeated switches with heterogeneous native codecs versus a common permitted output. Measure conversion cost, switch latency, gaps and retained video. Require equal language/role/track intent and compatible rates/layouts.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R016.keep-a-stable-audio-output-format-through-frequent-switches.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R016.keep-a-stable-audio-output-format-through-frequent-switches.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R016.keep-a-stable-audio-output-format-through-frequent-switches.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R016.keep-a-stable-audio-output-format-through-frequent-switches.md)
