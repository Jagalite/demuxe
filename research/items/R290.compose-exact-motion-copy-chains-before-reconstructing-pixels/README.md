<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compose exact motion-copy chains before reconstructing pixels

Full identity: `R290.compose-exact-motion-copy-chains-before-reconstructing-pixels`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current software/browser bridge returns reconstructed planes or frames, not symbolic prediction maps. Historical matches were detected after full decode, so they did not eliminate real MPEG2 reconstruction.

Next action: Expose eligible no-residual integer-motion syntax from controlled MPEG2 decoder; compare one composed-chain suffix and chroma misalignment/changing-boundary fallback before performance claims.

## Definition and contract

Mechanism. In a controlled software decoder, represent eligible predictions as mappings to immutable anchor pixels or reconstructed patches. For a pure-copy picture, F_t(p) = F_(t-1)(g_t(p)); compose the maps across several pictures instead of copying full intermediate planes. This is a pull-back coordinate map, not an estimate of physical motion. Syntax and reference bookkeeping still advance normally. First scope. Restricted progressive MPEG-2 I/P video, one forward reference, no coded residual in eligible blocks, and motion that is an integer sample displacement on every affected plane. Integer luma motion alone is insufficient when chroma is subsampled. No bidirectional averaging, fractional interpolation, or unmodeled filtering. Unsupported blocks are eagerly reconstructed as materialized leaves or cause a conservative fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R289-R294-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R289-R294-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md)
