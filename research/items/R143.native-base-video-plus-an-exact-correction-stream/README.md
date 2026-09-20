<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native base video plus an exact correction stream

Full identity: `R143.native-base-video-plus-an-exact-correction-stream`.

Current decision: **stop_current_profile** (actual_native_decode_and_gpu_reconstruction).

Native AV1 base plus zlib signed16 corrections reconstructs every source I420 sample exactly using WebGL2 integer textures/shader and full readback oracle. All3 pictures, base-identity guards, decoded frame cleanup and GPU owner destruction pass over7 alternating fresh jobs. Complete measured local preparation+decode+GPU jobs cost median1.3246x direct native lossless and payload9732 versus6471bytes. Stop this same-grid8bit profile. No HDR/upsampling, physical hardware decoder, arbitrary base portability or generic player integration claim.

Next action: Reopen for a relevant precision/upsampling profile with a declared deterministic base oracle and demonstrably cheaper correction production.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Prepared real AV1 base, independent exact base references and compressed signed16 correction stream. |
| screen | passed | Actual WebGL2 integer reconstruction exercised, not CPU-only correction simulation. |
| correctness | passed | All3 full sample planes and PTS native base exact; corrected GPU bytes source-exact in7 jobs with source/base guards and all owners closed. |
| performance | failed | Median1.3246x complete measured local job, all7 ratios1.269–2.471x;50.39% more coded bytes. |
| results | passed | Native AV1 base plus zlib signed16 corrections reconstructs every source I420 sample exactly using WebGL2 integer textures/shader and full readback oracle. All3 pictures, base-identity guards, decoded frame cleanup and GPU owner destruction pass over7 alternating fresh jobs. Complete measured local preparation+decode+GPU jobs cost median1.3246x direct native lossless and payload9732 versus6471bytes. Stop this same-grid8bit profile. No HDR/upsampling, physical hardware decoder, arbitrary base portability or generic player integration claim. |
| decision | passed | Native AV1 base plus zlib signed16 corrections reconstructs every source I420 sample exactly using WebGL2 integer textures/shader and full readback oracle. All3 pictures, base-identity guards, decoded frame cleanup and GPU owner destruction pass over7 alternating fresh jobs. Complete measured local preparation+decode+GPU jobs cost median1.3246x direct native lossless and payload9732 versus6471bytes. Stop this same-grid8bit profile. No HDR/upsampling, physical hardware decoder, arbitrary base portability or generic player integration claim. |

[New run](../../shared/runs/20260919T233552Z-native-correction/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
