<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# standalone FLAC from original frames

Full identity: `R245.standalone-flac-from-original-frames.report-c`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

This report supplies corrected STREAMINFO and exact bounded PCM for three original FLAC frames, unlike the R223 stale-total microstream. Current player has no standalone audio-excerpt author; importing this requires that narrow framing owner.

Next action: Implement one complete-frame excerpt writer only when requested, correct total samples/checksum, and compare frame payloads, PCM, duration and corrupted CRC rejection.

## Definition and contract

A six-second stereo FLAC is encoded with 4,096-sample frames. Source frames 20–22 are packet-copied into a new FLAC. The STREAMINFO total-sample count is corrected to 12,288 and the MD5 is replaced with the exact bounded PCM signature. All three compressed frame hashes are unchanged and all three durations remain 4,096 samples. Decoding yields exactly the corresponding 12,288 source PCM samples. flac -t passes, FFprobe reports 0.256 s, and Chromium decodeAudioData returns exactly 12,288 samples at 48 kHz. This fixture's mini-file is 18,021 bytes, 7.63% of the stereo six-second source. The percentage is content/channel-dependent; the source-preserving frame extraction is the important result.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R245.standalone-flac-from-original-frames.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R245.standalone-flac-from-original-frames.report-c.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R245.standalone-flac-from-original-frames.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R245.standalone-flac-from-original-frames.report-c.md)
