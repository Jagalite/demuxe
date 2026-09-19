<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Dependency-aware transport

Full identity: `R087.dependency-aware-transport`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current source delivery requires exact validated file ranges. Synthetic base/enhancement WebSocket loss demonstrates a dependency rule, not fidelity-preserving transport for ordinary compressed files; degraded frames are outside the current output request.

Next action: For explicitly permitted scalable live delivery, first establish a real coded layer dependency and deadline-aware transport, with missing-base rejection.

## Definition and contract

The exact WebTransport experiment is blocked because WebTransport is not exposed in the permitted context. A WebRTC data-channel fallback was also attempted, but both peer connections completed ICE gathering with no usable candidates and the channel remained connecting. The dependency policy was therefore tested over real browser WebSockets to a loopback server, with the server intentionally dropping selected messages. Each synthetic frame was split into a 4-bit coarse base and a 4-bit enhancement residual. - all 120 base frames arrived; - 84 frames reconstructed exactly; - 36 frames reconstructed from base only; - 0 frames were missing; - base-only quality was about 29.24 dB PSNR. Negative control: with every enhancement delivered but base frame 57 dropped, 119 frames reconstructed exactly and 1 frame was unrecoverable.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R087.dependency-aware-transport.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R087.dependency-aware-transport.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R087.dependency-aware-transport.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R087.dependency-aware-transport.md)
