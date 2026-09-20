<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare raw-YUV VideoFrame presentation with existing Software output

Full identity: `R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output`.

Current decision: **stop_current_profile** (actual_whole_player_correctness_failure).

Stop the actual whole-player raw-I420 VideoFrame replacement profile after colored-output failure. The earlier 35.4% prepared-grayscale component result remains historically valid but does not establish whole-player benefit. Actual maintained Player execution resolved the missing YUV runtime through an isolated link. Shipping RGB passed grayscale and colored BT709 I420 FFV1/PCM picture oracles (maximum RGB difference 3). Existing YUV and raw-I420 VideoFrame candidate passed grayscale (maximum 1) but both failed the predeclared colored whole-image max 8 / p99 4 gate (maximum 114, p99 44). Flat colored patch centers agreed within 1; transition reconstruction differs, with root cause not yet established. Real 440 Hz rendered audio, continuous progress, backward/forward seeks and gray owner cleanup passed. No whole-player performance comparison was run after the color fidelity failure. Earlier prepared-grayscale component saving remains a valid scoped observation, not a production benefit.

Next action: Reopen this whole-player profile only with a corrected candidate or independently justified output contract that passes colored-picture equivalence, then finish lifecycle/adverse controls before full-player performance. Do not relax thresholds retroactively.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Predeclared scoped component execution and measured results recorded; not production qualification. |
| screen | passed | Predeclared scoped component execution and measured results recorded; not production qualification. |
| correctness | failed | New whole-player colored-output contract failed max 8 / p99 4 gate: raw-I420 VideoFrame and YUV control max114/p9944 versus independently decoded reference; shippingRGB max3. This supersedes current qualification depth without invalidating older prepared-grayscale component correctness. |
| performance | not_applicable | Whole-player comparison not run after colored-output failure; older35.4% prepared-grayscale component saving is retained historically, not treated as current whole-player benefit. |
| results | passed | Stop the actual whole-player raw-I420 VideoFrame replacement profile after colored-output failure. The earlier 35.4% prepared-grayscale component result remains historically valid but does not establish whole-player benefit. Actual maintained Player execution resolved the missing YUV runtime through an isolated link. Shipping RGB passed grayscale and colored BT709 I420 FFV1/PCM picture oracles (maximum RGB difference 3). Existing YUV and raw-I420 VideoFrame candidate passed grayscale (maximum 1) but both failed the predeclared colored whole-image max 8 / p99 4 gate (maximum 114, p99 44). Flat colored patch centers agreed within 1; transition reconstruction differs, with root cause not yet established. Real 440 Hz rendered audio, continuous progress, backward/forward seeks and gray owner cleanup passed. No whole-player performance comparison was run after the color fidelity failure. Earlier prepared-grayscale component saving remains a valid scoped observation, not a production benefit. |
| decision | passed | Stop the actual whole-player raw-I420 VideoFrame replacement profile after colored-output failure. The earlier 35.4% prepared-grayscale component result remains historically valid but does not establish whole-player benefit. Actual maintained Player execution resolved the missing YUV runtime through an isolated link. Shipping RGB passed grayscale and colored BT709 I420 FFV1/PCM picture oracles (maximum RGB difference 3). Existing YUV and raw-I420 VideoFrame candidate passed grayscale (maximum 1) but both failed the predeclared colored whole-image max 8 / p99 4 gate (maximum 114, p99 44). Flat colored patch centers agreed within 1; transition reconstruction differs, with root cause not yet established. Real 440 Hz rendered audio, continuous progress, backward/forward seeks and gray owner cleanup passed. No whole-player performance comparison was run after the color fidelity failure. Earlier prepared-grayscale component saving remains a valid scoped observation, not a production benefit. |

[New run](evidence/20260920T125903Z-whole-player-disposition/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
