<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Test an explicit quantized-FLAC policy using the normal decoder

Full identity: `R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current FLAC path requires established integer precision and rejects unqualified conversion. allowLossy applies Opus, not an explicit float quantization/error policy. Float-to-24-bit FLAC needs a separate requested fidelity contract; it must not weaken sample-exact admission.

Next action: Define a research-only float quantization contract on one in-range signal plus out-of-range rejection and compare against the same normal float decoder.

## Definition and contract

Audio · New fidelity-option hypothesis · P2 · Risk: Medium First environment: Host FFmpeg + browser; Wasm later. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Keep the normal float decoder and explicitly permit conversion to integer PCM before FLAC. This could provide a bounded-error middle option between a different fixed decoder and perceptual Opus/AAC encoding. Source basis. FLAC specifies integer sample coding, while FFmpeg exposes sample-format conversion and dithering. Float-to-integer quantization is a distinct, potentially lossy stage even when FLAC round-trips its integer input exactly. [F4, F5] First agent experiment. Compare float-to-24-bit and, only if the destination supports it, float-to-32-bit conversion against the same normal decoder reference. Measure RMS/peak error, clipping/headroom, sample counts, output size and complete playback cost.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md)
