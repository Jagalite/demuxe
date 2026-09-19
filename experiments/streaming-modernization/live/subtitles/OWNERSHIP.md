<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Subtitle integration stage

This opt-in overlay follows the discontinuity stage. It does not change the three
public playback modes or add a second subtitle clock.

* libass 0.17.5 is pinned to commit `4a05d8127f525943ebf45fdc6497c9e665947f0d`.
  Its source archive SHA-256 is
  `3546ecc8748c62e100a9dd18e52ea2d17d7facedf89cfcad97000ad60b1bce2b`.
  Upstream added event pruning in 0.17.4; 0.17.5 also fixes two out-of-bounds writes.
  See https://github.com/libass/libass/releases/tag/0.17.5.
* FFmpeg remains the MPD and fragmented MP4 owner. The integrated container task
  now admits a single subtitle stream in MOV, with the same bounded packet queue.
  The initial qualified codec target is `mov_text` (tx3g). Raw DASH WebVTT without
  initialization data, stpp and encrypted text are not established by this stage.
* The component coordinator maps subtitle timestamps using the accepted video
  timeline. Quality changes preserve that group. Seeks rebuild it and mpv clears
  decoded cues so the demuxer can repopulate the accepted target, including cues
  that span the target.
* Integrated sources set `sub-ass-prune-delay=60` and `sub-clear-on-seek=yes`.
  Other sources restore the existing defaults. These are private engine settings,
  not a second public playback API.
* A source-scoped per-component admission ledger retains cue costs until their
  end precedes the incoming accepted subtitle timestamp by 60 seconds. Each
  packet is at most 16 KiB; each ledger is bounded to 4096 entries and 512 KiB of
  payload plus a conservative 512-byte cost per cue. Long-lived cues remain
  charged. Invalid durations and exhausted admission return errors rather than
  silently dropping active cues. This is an encoded-cue admission budget, not an
  assertion that libass allocations equal the ledger cost. Render-side retention
  and cache lead must be measured independently.

`dash-subtitle-native-01` proves packet timing across two periods and three quality
switches before admission was added. `cue-budget-units-01` covers rolling history,
long-lived density, integer overflow, and a fresh ledger under ASan/UBSan.
`dash-subtitle-native-03` also seeks backward to nine seconds and recovers the
cue spanning eight through ten seconds. `libass-prune-wasm-04` executes the exact
new library under Node: 1000 sequential cues peak at 32 retained events, and a
long-spanning cue survives pruning and can be reloaded after flushing. Attempts
01-03 preserve SDK setup failures. These checks do not establish browser
subtitle rendering or fonts.

Build snapshots are immutable evidence: `subtitles-01` contains the dependency
update and discontinuity implementation only. Later worker/pruning, MOV-subtitle
and admission changes require a fresh snapshot and new qualification.
