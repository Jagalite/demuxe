<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Derive audio-effect preroll from a guaranteed error budget

Full key: `R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget`

Current decision: **pursue** (2026-09-19T22:50:00.842340+00:00).

Executed opt-in Q24 integer first-order lowpass y=floor((255*y+x)/256) under explicit |input|,|state|<=1 and normalized absolute error budget1e-4. Derived state difference plus two implemented-arithmetic rounding bounds:2*(255/256)^N+512/2^24; exact rational comparison certifies N2624 and bound9.9827351e-5. Continuous-reference comparisons across seeded noise and positive/negative DC, targets20000/80000/160000, all2048 output samples each: maximum observed error2.7298927e-5. Zero-preroll errors up to0.996; rounding-floor, near-unit excessive preroll, unknown bounds, source identity and cancellation controls reject. Five alternating complete source-read/hash/bounds/certificate/three-seek jobs:19.022ms candidate versus33.121ms full-prefix replay, ratio0.57431 passes<=0.9. Baseline does not compute candidate certificate.

Pursue only explicit bounded-error Q24 controlled-filter seeking with this admitted source/state bound. This changes numerical semantics and cannot replace exact checkpoints, arbitrary effects, decoder preroll or production routing. Near-unit poles and budgets below arithmetic floor remain rejected with full-prefix replay as separate baseline. Generic floating-point filters require their own implemented-arithmetic proof; no general DSP qualification.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T225000Z-effect-preroll/run.json) · [Analysis](../../shared/runs/20260919T225000Z-effect-preroll/analysis.md) · [Manifest](../../shared/runs/20260919T225000Z-effect-preroll/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D58 — Give a native IIR filter only enough history for a declared error budget**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch12_D56-D58/demuxe_batch12/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D58 — deferred_profile_followup**: A bounded-error IIR preview is opt-in, not transparent exact playback. Defer the browser arithmetic guarantee and full-cost comparison until a preview consumer exists.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
