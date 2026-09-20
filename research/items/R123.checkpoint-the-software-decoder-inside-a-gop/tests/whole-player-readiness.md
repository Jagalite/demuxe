<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# R123 whole-player readiness and opportunity assessment

**Do not prioritize a full-player checkpoint implementation in this campaign.** This is an integration/opportunity decision, not a failed experiment or a reversal of the bounded research result. No builds or playback runs were performed.

The measured **16.57%** benefit applies to three repeated suffix decodes in an already-loaded, standalone160×96, no-B AVC decoder. Its95% paired saving interval was1.565–22.23%; cold startup was substantially more variable. It does not measure maintained player scrubbing.

The research bridge calls FFmpeg’s internal `ff_h264_update_thread_context` after initializing a new single-thread context. It preserves an in-process handle, not portable serialization. The maintained player exposes an opaque mpv handle and asynchronous command/render APIs, with two video decoder threads. The Hybrid bridge has a private software fallback context, but its reset discards replay and flushes decoder state; that is not a safe checkpoint transaction.

No wholesale codec rewrite is established as necessary, but an internal decoder patch and coordinated player ownership work are necessary. The missing hooks are:

- Version-pinned internal codec copier exposed at proved fully drained picture boundary; thread ownership must be safe, not call single-thread prototype on active two-thread decoder.
- Stable source/config/runtime/owner/recipe key plus bounded retained DPB references and explicit eviction/drop.
- Demux index and exact next compressed packet position restore; preserve PTS/DTS and replay dependencies.
- Transactional mpv decoder/filter/presenter queue reset or restore with matching audio clock/seek intent; reject queued stale output.
- Seek/cancel/source-change race protocol and fallback to ordinary exact seek when any profile or state requirement fails.
- Actual whole-player comparison against current persistent seek owner including checkpoint creation, peak retention, cancellation and teardown.

R055’s bounded preview LRU and R073’s already-pending exact GOP batch are narrower alternatives with less decoder-internal coupling. Their42.93% and29.15% component results use different workloads and baselines, so they cannot be numerically ranked against R123. Neither replaces actual sequential exact Software seeks. Prefer them only when their real request patterns apply.

Reopen R123 when a real repeatedly sought eligible GOP shows replay dominates the complete player cost and those simpler request-level alternatives cannot serve it. Do not build a new checkpointed player merely to reproduce a prepared-component speedup.

## Source evidence

- `research/shared/tooling/build-codec-checkpoint.py` lines 3-23: Research bridge allocates a fresh H264 AVCodecContext, forces thread_count1, initializes parameters, then calls internal ff_h264_update_thread_context; saved state is one in-process handle.
- `research/shared/tooling/codec-checkpoint-operation.mjs` lines 2-3: No-B160x96 AVC at24fps, fully drained picture30, three30-picture suffix jobs. Source/runtime/owner/version/nextPacket guards are JavaScript wrapper state; no player audio/filter/demux restoration.
- `native/player.c` lines 16-76: Maintained software player owns opaque mpv handle/render context; vd-lavc-threads2. Exported web_command_args forwards asynchronous mpv commands, not AVCodecContext handles.
- `native/vd_browser.c` lines 53-66,187-216: Hybrid bridge has private software fallback context thread_count2; reset clears replay, flushes software codec, resets lavc state and browser owner. This is not a complete checkpoint restore hook.
- `scripts/build-software-yuv.sh` lines 22-31: Player exports are lifecycle/command/render/audio APIs, with no checkpoint save/restore/drop ABI.
- `research/items/R055.cache-bounded-decoded-previews-for-scrub-revisits/item.json`: Eight-image requested-preview LRU saves42.93% only on revisits; one-way traversal loses4.20%. Different scope and baseline, so not directly superior by ratio.
- `research/items/R073.decode-a-gop-once-for-a-pending-exact-preview-batch/item.json`: Persistent browser decoder batching saves29.15% for already-pending exact requests; does not wait to fill batch. Different scope and cannot replace sequential live software seeks.
