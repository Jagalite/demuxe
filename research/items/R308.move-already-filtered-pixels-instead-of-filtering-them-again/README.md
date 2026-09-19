<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Move already-filtered pixels instead of filtering them again

Full identity: `R308.move-already-filtered-pixels-instead-of-filtering-them-again`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current presenter does not receive ZMBV copy certificates or filter-footprint maps. The report exact sparse output was slower than vectorized full filtering; that is a historical implementation negative, not universal rejection. Low-overhead motion plumbing is new setup.

Next action: First expose one ZMBV motion-copy certificate without guessing from residual alone, then compare a single eligible interior plus mixed-motion boundary.

## Definition and contract

Class: Exact downstream video-work reuse. Output contract: Same processed picture as rerunning the specified filter graph on every decoded source frame. Related: R237's region requirements and R290's exact motion mappings; neither prior implementation is a prerequisite. A controlled ZMBV decoder exposes block motion copying and optional XOR differences [S3]. For an admitted block with no changed pixels, use the validated copy mapping to identify pixels that have already passed through the same effects. Let a source patch obey F_t(p) = F_(t-1)(p-v). For a fixed translation-equivariant local operator P, P(F_t)(p) = P(F_(t-1))(p-v), provided every source sample in the operator's full dependency footprint obeys the same mapping.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md)
