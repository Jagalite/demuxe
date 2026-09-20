<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep a stable audio output format through frequent switches

Full key: `R016.keep-a-stable-audio-output-format-through-frequent-switches`

Current decision: **stop_current_profile** (2026-09-19T22:00:07.933497+00:00).

Compatible48kmono integerFLAC16/24 tracks220/440Hz promote to common24bit with every host integer sample exact. Native Chrome3segment switching passes distinct track tones, marker timing about1.4ms, zero measured audio gaps, continuous H264pictures, parser abort/reset, unsupportedchangeType guard, forward/backwardseek, EOF and samebuffer ownership. Wrong+0.2s timeline fails independent marker oracle. Five alternating cold hostprepare plus matched browser creation/appends/cleanup:commonformat60.614+8.685ms versus nativecopy53.638+8.460ms, ratio1.11597 fails1.10. Native varyingprecision baseline already passes identical observable switch contract; no actual decoder-instance reuse inferred.

Stop current commonFLAC preparation cost profile for these compatible integer tracks. This compares FLACprecision configurations, not heterogeneous codec switching or resampling. Reopen with repeated-source amortization or a source pair showing real native reconfiguration disruption; include exact precision, requestedtrackidentity and full preparation cost. No production route changes.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T220007Z-stable-flac/run.json) · [Analysis](../../shared/runs/20260919T220007Z-stable-flac/analysis.md) · [Manifest](../../shared/runs/20260919T220007Z-stable-flac/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
