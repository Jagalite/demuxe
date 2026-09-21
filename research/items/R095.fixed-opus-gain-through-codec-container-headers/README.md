<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fixed Opus gain through codec/container headers

Full key: `R095.fixed-opus-gain-through-codec-container-headers`

Current decision: **pursue** (2026-09-19T21:23:45.431436+00:00).

Existing+3dB plus requested-6dB becomes-3dB Opus header with every encoded packet unchanged. All96000 browser output samples match GainNode reference within7.451e-9, RMS ratio1.000000006; double attenuation control yields0.501187 ratio. Nine-pair full copy/patch/decode/render/cleanup median3.880ms versus3.985ms (0.97365x) passes1.10 no-regression ceiling. Prior actual native seek/EOF persistence is pinned and reused.

Pursue static WebM Opus gain metadata for this known existing-gain policy. No generalized speedup, physical energy, dynamic gain automation, loudness-tag rewrite, Ogg or MP4 claim.

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

[Run](../../shared/runs/20260919T212345Z-opus-gain-cost/run.json) · [Analysis](../../shared/runs/20260919T212345Z-opus-gain-cost/analysis.md) · [Manifest](../../shared/runs/20260919T212345Z-opus-gain-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D15 — A remux must retain both gain and end trimming**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch03_D14-D20/demuxe_batch3/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
