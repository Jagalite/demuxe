<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reservoir-aware MP3 repacketization

Full key: `R122.reservoir-aware-mp3-repacketization`

Current decision: **stop_current_profile** (2026-09-19T22:48:32.024471+00:00).

Real MPEG1 LayerIII48k stereo128kbps source has334 reservoir-bearing frames, backpointers up to511bytes. Coded units gathered across main-data slots, with granule coded-bit lengths and all side information retained except rewritten zero main_data_begin; ordinary320kbps frames reconstructed. Whole385920 stereo sample frames and repeated targets100/220 with3frame synthesis preroll exactly match continuous host and Chrome PCM, render/end/closed. No preroll changes PCM; missing dependency, source identity, unit proof and cancellation reject. Five alternating20-excerpt complete cold parse/rebuild/decode versus direct frame-index/copy/decode medians1033.707ms vs982.014ms ratio1.05264; output bytes2.5x. Both miss predeclared<=0.9cost and<=1.25bytes. Initial baseline unnecessarily reconstructed units; invalid measurements and executed script retained separately, final direct index baseline authoritative.

Stop the fixed320kbps zero-reservoir profile. Reconstruction capability and synthesis history are demonstrated for this restricted noCRC/noXing MPEG1 stereo profile; no universal preroll count or broader MP3 mapping claim. Reopen only with materially better packing/reuse economics and new exact-output controls.

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

[Run](../../shared/runs/20260919T224832Z-mp3-reservoir/run.json) · [Analysis](../../shared/runs/20260919T224832Z-mp3-reservoir/analysis.md) · [Manifest](../../shared/runs/20260919T224832Z-mp3-reservoir/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
