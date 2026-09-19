<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Move MSE ownership off the window thread

Full identity: `R005.move-mse-ownership-off-the-window-thread`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Worker-owned MediaSourceHandle produces actual A/V through EOF with malformed-input rejection and teardown; localized scheduler integration merits testing, not proven UI/CPU improvement.

Next action: Specify one concrete wrong-output or provenance failure the proposed tool must detect beyond the existing harness.

## Definition and contract

Delivery · New execution-plan hypothesis · P1 · Risk: Medium First environment: Browser-only first; Demuxe integration later. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Create MediaSource and append/remove scheduling in a dedicated worker, passing a MediaSourceHandle to the visible video element. Keep blocking FFmpeg execution on a different worker unless its calls genuinely suspend. Source basis. MSE defines worker construction and transferable handles. Support must be detected in the runtime; a handle is not a transferable MediaSource object. [M1] First agent experiment. Compare window-owned and worker-owned MSE under identical UI layout/animation load. Use unchanged fMP4 output first; add remux only after the ownership test passes. Include worker death, source replacement and detach during append.

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R005.move-mse-ownership-off-the-window-thread.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R005.move-mse-ownership-off-the-window-thread.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R005.move-mse-ownership-off-the-window-thread.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R005.move-mse-ownership-off-the-window-thread.md)
- [results/full-completion/continuity/worker-result.json](../../../results/full-completion/continuity/worker-result.json)
