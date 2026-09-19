<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode a GOP once for a pending exact-preview batch

Full identity: `R073.decode-a-gop-once-for-a-pending-exact-preview-batch`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

No pending exact-preview request batch owner exists. Current decoder is single playback generation; historical twelve-process baseline is not current persistent-Wasm scheduling cost.

Next action: Define pending-only same-GOP batching with no wait-to-fill; compare requested frames to full decode and reject sparse/different-source jobs or cancellation leakage.

## Definition and contract

Question. Can multiple already-pending thumbnail requests share decoding while still returning every exact requested image? This is neither dropping superseded scrub requests nor relying on cache hits. Twelve requested frames between indices 123 and 177 lie in one closed GOP of the same H.264 source. The baseline launches twelve independent accurate-seek jobs. The candidate seeks once to that GOP and emits the requested frames. An independent full-decode-from-start path serves as a third oracle. All twelve output hashes agree across all three paths. Median CPU is 1761.90 → 213.58 ms; wall time is 1312.43 → 139.23 ms. Process count falls from twelve to one. The measured reduction combines process launch, probing, seeking and repeated decode avoidance; it is not a claim that the decoder itself becomes eight times faster. An already-persistent Wasm decoder would have a different baseline.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
