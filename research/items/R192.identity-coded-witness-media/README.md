<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# identity-coded witness media

Full identity: `R192.identity-coded-witness-media`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_AS_TEST_TOOL** (full-completion).

Current campaign oracles reject missing hidden picture dependencies, deliberate channel loss and doubled gain, and check cue timing. These concrete failures justify identity-bearing witnesses as test infrastructure. A single unified per-epoch video/channel/audio-shift witness is still future implementation, not claimed executed here.

Next action: Specify one concrete wrong-output or provenance failure the proposed tool must detect beyond the existing harness.

## Definition and contract

The four-second fixture carries independent identities in multiple dimensions: - each video second has an eight-bit visual code: 0xA0, 0xA1, 0xA2, 0xA3; - left-channel tones are 320/400/480/560 Hz by second; - right-channel tones are 900/1000/1100/1200 Hz. Both FFmpeg-based and Chromium-based oracles accepted the correct file. Three decodable, believable wrong variants were then tested: 1. video timeline reorder: codes became A0, A2, A1, A3; audio still looked correct; 2. stereo channel swap: video remained correct, but the per-channel tones reversed; 3. 0.5 s audio shift: video remained correct, but time-local audio identities no longer matched their expected epochs. All three were detected by both host and browser identity checks. This demonstrates why fixtures that merely contain “moving video + audible tone” can accept convincingly wrong playback.

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
| decision | passed | Historical decision imported verbatim: PURSUE_AS_TEST_TOOL. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R192.identity-coded-witness-media.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R192.identity-coded-witness-media.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R192.identity-coded-witness-media.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R192.identity-coded-witness-media.md)
- [results/full-completion/r332/result.json](../../../results/full-completion/r332/result.json)
- [results/full-completion/r41/result.json](../../../results/full-completion/r41/result.json)
- [results/full-completion/r57/result.json](../../../results/full-completion/r57/result.json)
- [results/full-completion/r95/result.json](../../../results/full-completion/r95/result.json)
