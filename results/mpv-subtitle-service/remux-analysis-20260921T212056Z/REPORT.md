# Remux failure investigation and fixes

The reproduced HEVC B-frame rejection and long-GOP stall are fixed in the local packet-copy bridge. The historical seek failure did not reproduce on the current code; both current ownership paths and the synchronized mpv subtitle prototype pass explicit seek checks. No automatic subtitle routing was enabled.

## Confirmed causes

1. **HEVC Matroska decode timestamps.** DTS reconstruction previously applied only to AVC. The HEVC B-frame fixture reproduced `Selected timeline discontinuity`. HEVC initialization now parses the SPS reorder bounds through the existing FFmpeg parser, enforces the existing 16-picture budget, and uses the bounded DTS reconstruction queue. Presentation timestamps and encoded packets remain intact; monotonic-DTS rejection remains enabled.
2. **Eviction crossing a keyframe.** The long-GOP trace recorded a source RAP at 0.023 seconds and removed through 1.02299 on the biased MSE timeline. The captured MP4 actually placed that keyframe at 1.022. Truncating a floating-point timestamp shift lost a millisecond, so removal consumed the retained GOP and playback stalled near 6.5 seconds. Integer time-base rescaling replaces truncation, and RAP notifications use output-timebase timestamps.
3. **Fragment-boundary timestamp adjustment.** Packet verification caught another one-tick change at the first packet after a custom MP4 flush. The pinned FFmpeg movenc implementation otherwise substitutes the previous fragment's duration sum for the new packet DTS. Reasserting `frag_discont` for each custom boundary preserves explicit packet timestamps. This is a muxing policy, not relaxed input validation.

The short-GOP seek sequence already passed before these changes in both worker and window ownership. Existing seek-race handling and tests were present in the dirty checkout. This task does not claim to have authored or conclusively attributed the earlier seek fix.

## Executed validation

- Final window-owned run: `../remux-2026-09-21T21-14-57.967Z/results.json`.
- Final worker-owned run: `../remux-2026-09-21T21-16-05.071Z/results.json`.
- Each run covers B-frame HEVC, long-GOP HEVC without B frames, and the short-GOP control: about 14 seconds of playback followed by seeks 2 → 5 → 13 → 2 → 35. All six cases pass progression, frame-count and compositor target-frame checks.
- `../remux-2026-09-21T21-14-57.967Z/av-packet-verification.json`: 188 captured video packets and 333 AAC packets match the input payload hashes. Video presentation spacing is unchanged, DTS is strictly increasing, and A/V timestamp rounding differs by at most 11 microseconds, below one 44.1 kHz audio sample. This is prefix verification, not whole-file packet coverage.
- Synchronized subtitle/video runs (qualified, B-frame, long-GOP): ../2026-09-21T21-17-23.193Z/, ../2026-09-21T21-18-35.952Z/, ../2026-09-21T21-19-09.000Z/. Each seeks 2 → 5 → 13 → 2 → 39. Subtitle masks match Software exactly at sampled cue times; cue expiry is empty in both. All workers close and the mpv subtitle service creates zero A/V chains. These use real native seeks, unlike the earlier injected subtitle-only clock test.
- 26 existing unit checks pass: seek-frame races, buffering, packaging and EOF coverage. See the saved test log.
- Rebuilt pthread and JSPI packet-copy engines. All 11 existing JSPI browser checks pass: `../../remux-jspi/2026-09-21T21-17-58.109Z/result.json`. This also exercises H.264/AAC regression playback, seek, replacement, identity and cancellation.
- The optional audio-adaptation compilation path passes a syntax check; its runtime was not rebuilt or functionally qualified in this task.

## Retained failures

The first harness attempt used an unsupported event API and is retained at `../remux-2026-09-21T21-05-46.228Z/`. Actual baseline failures are at `../remux-2026-09-21T21-06-07.877Z/`, with window-owner and removal traces at `../remux-2026-09-21T21-07-51.883Z/`, `../remux-2026-09-21T21-09-01.904Z/` and `../remux-2026-09-21T21-10-02.215Z/`. The intermediate packet comparison exposed the extra fragment-boundary tick before the final fix. Raw runs are preserved.

## Scope and handoff

The production source change is confined to `native/remux/remux.c`, plus rebuilt local packet-copy assets. Existing unrelated edits remain in place; `task-only.patch` isolates this task's C changes against its starting snapshot. Added laboratory harnesses provide executable regression reproduction. No commit or push was performed.

These are authored 40-second 720p Main10/AAC/ASS fixtures in Chrome. The user's original MKV, Firefox output, arbitrary HEVC profiles/reorder structures, remote large-file subtitle transport, heavy ASS and endurance remain unqualified. The subtitle service still has its prototype full-file staging limit. Performance was not remeasured after the fixes.

Reproduction is documented in `experiments/mpv-subtitle-service/README.md`.
