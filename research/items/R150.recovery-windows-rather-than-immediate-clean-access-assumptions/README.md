<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recovery windows rather than immediate clean-access assumptions

Full identity: `R150.recovery-windows-rather-than-immediate-clean-access-assumptions`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The current packet route requires IDR start and buffered seeking requires a retained RAP. Recovery-point SEI could widen admission only with a separately represented verified recovery boundary; no such owner exists.

Next action: Add research metadata for access offset plus signaled recovery count on one intra-refresh fixture, compare every admitted frame to continuous decode and corrupt the count.

## Definition and contract

Encoded six seconds of H.264 with periodic intra refresh, no B frames and one reference frame. Parsed recovery-point SEI directly. Cuts at source packet indices 30, 60, 90 and 120 each advertise recovery_frame_cnt=18 and exact_match_flag=1 [S7]. For each cut, a fresh decoder receives source parameter sets plus the remaining compressed packets. showall is used to expose imperfect warm-up frames instead of hiding them. Frame hashes are compared with uninterrupted decoding of the same source. All four cuts have incorrect warm-up frames and first reach a permanently identical suffix at offset 18 frames. The tested conservative admission rule suppresses through the signaled count, admitting at offset 19. Every admitted suffix is exact. At 30 frames/s, the observed first exact suffix starts 0.6 seconds after the cut; this is a fixture-specific media recovery interval, not a startup-time benchmark.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md)
