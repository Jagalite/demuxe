<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Convert finite fMP4 fragments into a metadata-indexed native MP4 view

Full identity: `R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Native already attempts unchanged source direct playback before remux. Building a flat Blob view solely to remove app append ownership has no route gap when direct complete fMP4 is accepted; indexing can reopen only for demonstrated seek deficiency.

Next action: Reopen for a source where direct complete fMP4 lacks required seeking; first show that deficiency, then compare flat sample-table view with payload/CTS/64-bit-offset oracle.

## Definition and contract

Question. Can a native file view replace application append scheduling without rebuilding or copying the compressed payload? What differs from earlier work. Inverse of R46: consolidate fragmented timing/offset metadata rather than create MSE fragments from ordinary MP4. Input scope. Finite local clear fragments, one stable track/configuration set, known complete segment list. Mechanism to test. Build ordinary MP4 sample tables from fragment timing and sample descriptions; compose new headers with slices of the original media payload. Smallest experiment. 1. Try direct playback of the original complete fMP4 first. 2. Build a flat indexed view and compare with a trusted packet-copy unfragmenting muxer. 3. Exercise B-frame timestamps, a tail fragment and offsets above 32 bits using bounded fixtures.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R88-R101-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R88-R101-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/imported-opportunities-02-result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/imported-opportunities-02-result.json)
