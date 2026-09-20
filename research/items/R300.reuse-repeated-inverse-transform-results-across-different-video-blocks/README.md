<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse repeated inverse-transform results across different video blocks

Full identity: `R300.reuse-repeated-inverse-transform-results-across-different-video-blocks`.

Current decision: **stop_current_profile** (actual_modified_software_decoder_in_browser).

A real compiled Wasm AVC decoder caches exact signed4x4 inverse-transform residuals keyed by all16 dequantized coefficients, before adding each blocks own prediction/clipping. Bounded1024-slot collision-checked cache excludes zero/DC-only work and resets per owner. Graphics60frames and natural60frames match independent host full planes/PTS in all7 paired browser jobs. Hits are380/8553 (4.44%) and2465/26916 (9.16%). Median decode+oracle cost ratios1.101 and1.123; complete cold load/start/two-source job1.017 with broad0.417–3.052 range. No useful gain established; stop this cache variant, without claiming a stable general slowdown.

Next action: Reopen for a source with materially higher nontrivial coefficient reuse or cheaper measured lookup; retain pure residual/own-prediction separation and full-key collision checks.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Built matched actual FFmpeg IDCT Wasm variants and independent graphics/natural full-frame references. |
| screen | passed | Real decoder counters:8553/26916 eligible non-DC calls;380/2465 exact cache hits. |
| correctness | passed | 120 full frames and timestamps exact in each of7 pairs; each new source resets cache, later references remain exact. |
| performance | failed | No5% complete-job gain;1.017 median cold ratio,1.101/1.123 decode+oracle medians and102400B retained cache; variable timing disclosed. |
| results | passed | A real compiled Wasm AVC decoder caches exact signed4x4 inverse-transform residuals keyed by all16 dequantized coefficients, before adding each blocks own prediction/clipping. Bounded1024-slot collision-checked cache excludes zero/DC-only work and resets per owner. Graphics60frames and natural60frames match independent host full planes/PTS in all7 paired browser jobs. Hits are380/8553 (4.44%) and2465/26916 (9.16%). Median decode+oracle cost ratios1.101 and1.123; complete cold load/start/two-source job1.017 with broad0.417–3.052 range. No useful gain established; stop this cache variant, without claiming a stable general slowdown. |
| decision | passed | A real compiled Wasm AVC decoder caches exact signed4x4 inverse-transform residuals keyed by all16 dequantized coefficients, before adding each blocks own prediction/clipping. Bounded1024-slot collision-checked cache excludes zero/DC-only work and resets per owner. Graphics60frames and natural60frames match independent host full planes/PTS in all7 paired browser jobs. Hits are380/8553 (4.44%) and2465/26916 (9.16%). Median decode+oracle cost ratios1.101 and1.123; complete cold load/start/two-source job1.017 with broad0.417–3.052 range. No useful gain established; stop this cache variant, without claiming a stable general slowdown. |

[New run](../../shared/runs/20260919T235028Z-idct-cache-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
