<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Checkpoint the software decoder inside a GOP

Full identity: `R123.checkpoint-the-software-decoder-inside-a-gop`.

Current decision: **pursue** (actual_codec_aware_owned_state_in_wasm).

A pinned in-process AVC checkpoint owns codec-aware state through FFmpeg SPS/PPS/reference retention, DPB pointer rebasing and POC/MMCO/SEI copying, not raw context memcpy. At the fully drained no-B picture30 boundary, three restored30-picture suffixes remain host-exact after each prior live decoder reaches EOF. All source/runtime/owner/version/cut guards and dropped-handle rejection pass. Seven paired prepared-runtime jobs include checkpoint construction and3scrubs: median0.8343x replay cost, paired bootstrap95 ratio[0.7777,0.9844]. Cold startup is noisier (median0.9042x, range0.2065–1.3971), so pursue bounded already-loaded scrubbing only.

Next action: Keep pinned runtime/profile and source-owner guards. Portable serialization, B-frame queues and thread-transition support remain separate implementation work before broader qualification.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual codec-aware retained/rebased state copier wrapped by versioned in-process handle; no raw context memcpy. |
| screen | passed | Checkpoint inside one GOP restores repeated suffixes after original decoder continuation. |
| correctness | passed | 3x30 full frames/PTS exact per7paired jobs; source/runtime/owner/version/cut and dropped-handle controls; all owned contexts retired. |
| performance | passed | Prepared-runtime complete3scrub job including checkpoint construction median16.57% faster;95% paired-bootstrap saving1.565–22.23%; cold startup variability kept separate. |
| results | passed | A pinned in-process AVC checkpoint owns codec-aware state through FFmpeg SPS/PPS/reference retention, DPB pointer rebasing and POC/MMCO/SEI copying, not raw context memcpy. At the fully drained no-B picture30 boundary, three restored30-picture suffixes remain host-exact after each prior live decoder reaches EOF. All source/runtime/owner/version/cut guards and dropped-handle rejection pass. Seven paired prepared-runtime jobs include checkpoint construction and3scrubs: median0.8343x replay cost, paired bootstrap95 ratio[0.7777,0.9844]. Cold startup is noisier (median0.9042x, range0.2065–1.3971), so pursue bounded already-loaded scrubbing only. |
| decision | passed | A pinned in-process AVC checkpoint owns codec-aware state through FFmpeg SPS/PPS/reference retention, DPB pointer rebasing and POC/MMCO/SEI copying, not raw context memcpy. At the fully drained no-B picture30 boundary, three restored30-picture suffixes remain host-exact after each prior live decoder reaches EOF. All source/runtime/owner/version/cut guards and dropped-handle rejection pass. Seven paired prepared-runtime jobs include checkpoint construction and3scrubs: median0.8343x replay cost, paired bootstrap95 ratio[0.7777,0.9844]. Cold startup is noisier (median0.9042x, range0.2065–1.3971), so pursue bounded already-loaded scrubbing only. |

[New run](../../shared/runs/20260920T000513Z-codec-checkpoint-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
