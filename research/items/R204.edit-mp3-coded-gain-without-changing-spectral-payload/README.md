<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Edit MP3 coded gain without changing spectral payload

Full identity: `R204.edit-mp3-coded-gain-without-changing-spectral-payload`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current real-time gain already uses one GainNode without audio re-encoding. Editing MP3 global_gain is a narrow approximate altered-output/export representation, so it offers no demonstrated advantage over the existing live gain owner.

Next action: For a requested persistent MP3 gain edit, compare bounded MPEG1 mono side-info changes with declared amplitude tolerance and unchanged main data; reject gain underflow and MPEG2.

## Definition and contract

For a bounded MPEG-1 Layer III mono/no-CRC profile, every granule's global_gain was reduced by four steps while main-data/spectral payload hashes were left unchanged. Host decoded RMS became 0.500000004× the original (target 0.5); the maximum sample error versus half-amplitude was 5.31e-08. Chromium measured 0.499999757× after decoding at 48 kHz. Underflow is explicitly rejected and an MPEG-2 fixture fails this narrow admission profile instead of being patched with the wrong side-information layout. Output is intentionally changed; this is not bit-exact editing.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md)
