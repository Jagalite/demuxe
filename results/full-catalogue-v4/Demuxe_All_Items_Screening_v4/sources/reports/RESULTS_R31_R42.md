# Demuxe R31–R42 standalone route lab

**Date:** 2026-09-17  
**Environment:** Chromium 144.0.7559.96 headless on Debian 13; native FFmpeg 7.1.5; Python Playwright.  
**Scope:** standalone browser/host-media viability only. Demuxe production code was not modified. No Wasm/mpv performance claim is made.

## Verdict matrix

| ID | Verdict | Standalone result |
|---|---|---|
| R31 | **PROMISING / NARROW** | H.264 fMP4 video + raw ADTS AAC (`audio/aac`) and raw MP3 (`audio/mpeg`) both played, sought, and reached EOS under one MediaSource. Raw AAC kept the exact AAC payloads; `timestampOffset=1` shifted its buffered start to 1.0 s exactly, matching the fMP4 AAC control. |
| R32 | **PROMISING / NARROW** | H.264 fMP4 video + Opus WebM audio played, sought, and reached EOS. Opus packet hashes matched the MP4 Opus input exactly. |
| R33 | **DROP CURRENT CONFIG** | `frag_interleave` 1/2/4 did **not** expose a joint H.264/AAC buffered interval before the complete first ~106 KB fragment. These remuxes also changed the AAC tail (561 packets / 12.013 s vs default 564 / 12.077 s), so the tested candidates failed equivalence and gained nothing. |
| R34 | **STRONG PROMISE** | Adaptive 1 KiB startup → 16 KiB steady chunks reached first buffered video at 9,216 bytes / ~10.6 ms, then finished in ~92.3 ms with 14 appends. Fixed 1 KiB needed 89 appends / ~120.9 ms; fixed 16 KiB finished ~92.3 ms but first output was later (~17.9 ms). |
| R35 | **STRONG PROMISE** | While video kept running, future audio was replaced at T=4 s without pausing. FLAC marker changed 440→880 Hz at ~4.061 s; AAC at ~4.093 s. No `waiting` occurred at the boundary; the only waiting event was initial time 0. |
| R36 | **STRONG PROMISE** | Three 12 s items were appended into the same retained video/audio SourceBuffers (440→880→440 Hz). Both boundaries played through with zero waiting events. Old ranges were then removed and playback continued at 25 s. |
| R37 | **PROMISING** | After appending only 4 KiB, 12 KiB, or 32 KiB of a fragment, `SourceBuffer.abort()` plus replay of the complete fragment restored the full 0.0667–1.0667 s range on the same MediaSource. All three then decoded moving video. |
| R38 | **STRONG PROMISE** | A real `QuotaExceededError` occurred after 170 × 1,170,074-byte appends (~198.9 MB submitted). On the same MediaSource, moving the playhead forward, removing safely-behind buffered media, and retrying the rejected append succeeded and extended the range. |
| R39 | **PROMISING CONTROLLER EVIDENCE** | Under a deliberately severe 4× playback / 160 ms producer trace, bottleneck-first scheduling advanced to mean 10.688 s vs 9.762 s for equal alternation across 3 repeats (+0.926 s) with the same 18 producer slots. Both had 5 waiting events, so this is useful-work evidence, not a stall-elimination result. |
| R40 | **MIXED / INTEGRATION-ONLY** | For an 81-request scrub burst, coalescing reduced explicit seek assignments from 82 to 2 and preserved the exact final 7.3 s target. Direct-file wall time improved (74.5→19.6 ms), but MSE naive was already faster (8.2 ms vs 14.7 ms) because Chromium internally coalesced the burst. Use this to suppress Demuxe/source work, not as a claim that Chromium seeks faster. |
| R41 | **STRONG PROMISE / NARROW PROFILE** | Plain SRT timing, Unicode, multiline text, overlapping cues, and `<b>/<i>/<u>` mapped correctly to native `VTTCue`s and active-cue state after seeks. Unsupported `<font>` markup was rejected rather than silently simplified. |
| R42 | **STRONG PROMISE FOR ALLOCATION** | For 89 × 1 KiB append chunks, fresh allocation used 89 ArrayBuffers; a return-after-`updateend` pool used 1 buffer, with identical final buffered output. Timings were similar (~12.3 vs 11.9 ms), so the proven win is allocation ownership, not CPU. |

## R31 — Raw compressed audio beside fMP4 video

The target Chromium advertises and executed `audio/aac` and `audio/mpeg` SourceBuffers alongside an H.264 fMP4 video SourceBuffer.

- AAC fMP4: video range 0.0667–12.0667 s, audio 0–12.0213 s.
- Raw AAC: video range 0.0667–12.0667 s, audio 0–12.0320 s.
- Raw MP3: audio 0–12.0240 s.
- All three reached `ended=true` after `endOfStream()` with duration 12.0667 s.
- Raw AAC payloads were byte-identical to the AAC access-unit payloads from MP4 after stripping ADTS headers.
- Packaging size was 197,906 B MP4 vs 196,439 B ADTS: only 1,467 B smaller. The reason to pursue is avoiding an audio mux stage / packaging constraints, not file-size savings.
- `timestampOffset=1.0` moved both raw-AAC and MP4-AAC buffer starts to exactly 1.0 s. Starting playback at t=0 then stalled because active A/V coverage begins at 1 s; this is the same split-buffer timeline issue for both packaging forms, not a raw-AAC regression.

**Integration implication:** raw AAC/MP3 can be a finite per-track packaging option after demux has established source time. It depends on explicit generated-timestamp placement and track-lifetime policy for leading gaps.

## R32 — Mixed per-track containers

H.264 MP4 video + Opus WebM audio worked under one MediaSource. The mixed route preserved the ~883 Hz marker through startup and a seek to ~8.45 s and reached EOS correctly.

The 601 Opus packet data hashes were identical between the MP4 and WebM versions. Sizes were 241,618 B MP4 vs 240,849 B WebM. This establishes **packaging flexibility**, not a meaningful byte or CPU win by itself.

**Integration implication:** container choice can be negotiated per track. Keep this finite (known codec/container pairs) rather than building arbitrary component assembly.

## R33 — Intra-fragment interleaving

Tested `frag_interleave=1,2,4` and FFmpeg's default using copied H.264/AAC, 1 s fragment duration.

For all four files, Chromium exposed the first jointly buffered A/V range **only after the entire first fragment** arrived (~106–107 KB), even with 1 KiB incremental appends. The setting therefore did not reproduce the earlier video-only early-output benefit for a muxed A/V SourceBuffer.

Additionally, the tested interleaved outputs contained 561 AAC packets and 12.0133 s audio, versus 564 packets / 12.0773 s for the default candidate. This fails the experiment's equivalence gate.

**Verdict:** stop this branch unless a different pinned-FFmpeg construction can prove sample/tail equivalence first.

## R34 — Adaptive append batching

Same 90,419-byte video fragment, same bytes and timestamps, with a simulated constant byte-release cost.

| Policy | First buffered | Append calls | Full delivery |
|---|---:|---:|---:|
| whole | 90,419 B / 94.6 ms | 1 | 94.6 ms |
| fixed 1 KiB | 9,216 B / 11.5 ms | 89 | 120.9 ms |
| fixed 4 KiB | 12,288 B / 13.3 ms | 23 | 95.2 ms |
| fixed 16 KiB | 16,384 B / 17.9 ms | 6 | 92.3 ms |
| adaptive 1→16 KiB | **9,216 B / 10.6 ms** | **14** | **92.3 ms** |

**Integration implication:** preserve current fragment timing, but switch transport append size after first usable samples appear. Actual Demuxe integration must feed backpressure to the producer instead of merely accumulating larger JS queues.

## R35 — Future-boundary audio replacement

One MediaSource, one H.264 video SourceBuffer, one retained audio SourceBuffer. Old audio after T=4 s was removed while playback continued; replacement bytes were filtered with `appendWindowStart=4`.

- FLAC: first 880 Hz observation ~4.061 s.
- AAC: first 880 Hz observation ~4.093 s.
- No pause events.
- Waiting-event timestamps: `[0]` for both; none at the switch boundary.
- Video buffer remained 0.0667–12.0667 s.

The analyzer is a marker detector with 50 ms sampling; it does **not** prove zero-sample gap/overlap. Local qualification should use decoded/digital markers around the splice.

## R36 — Reuse one MSE presentation across queue items

Three clips were placed on one 36 s timeline using the same video/audio SourceBuffers and explicit offsets 0/12/24 s.

- Audio crossed ~12 s from 440→880 Hz.
- Audio crossed ~24 s from 880→440 Hz.
- `waiting` events across these tests: 0.
- Video and audio ranges were contiguous through ~36 s.
- Removing old ranges up to ~11 s left a bounded later presentation, and playback at 25 s continued normally.

**Integration implication:** viable for a compatible queue/loop plan. Product semantics still need explicit per-item time, source identity, subtitle/effect resets, events, and bounded next-item preparation.

## R37 — Recover interrupted partial append

Cuts tested: 4,096 / 12,288 / 32,768 bytes of the first video fragment.

The 12 KiB and 32 KiB cuts had already exposed partial buffered samples. In all cases, calling `abort()` after the partial append and then replaying the complete fragment produced the full 0.0667–1.0667 s range and decoded moving frames without replacing the MediaSource.

**Integration implication:** strong same-source seek/cancellation recovery primitive. Never replay stale generation/source bytes into a new authority context.

## R38 — Real quota recovery

A repeated fMP4 append test triggered Chromium's actual synchronous `QuotaExceededError` at append #170. Chromium had already auto-evicted early data and retained approximately 479.07–2040.07 s.

The test then:

1. moved currentTime to 1900 s,
2. removed buffered media from 479.07 to 1840 s,
3. retried the exact rejected append,
4. succeeded, extending the range to ~2052.07 s.

**Integration implication:** catch **only** QuotaExceededError, evict a bounded safe range relative to current/required decode dependencies, and retry at most under an explicit policy. Normal routing should never intentionally build a 1500+ second forward buffer.

## R39 — Prioritize the limiting track

Three repeat runs were essentially deterministic:

- equal alternation mean currentTime after the trace: **9.7623 s**,
- bottleneck-first mean: **10.6883 s**,
- mean improvement in useful playback progress: **+0.9260 s**.

Equal alternation finished with 12 video fragments vs 10 audio; bottleneck-first finished balanced at 11/11. Both saw five waiting events in the severe stress setup.

**Integration implication:** schedule toward the shortest **contiguous usable track horizon**, but only if real demux/producer topology can obtain the needed track work without a second scan or excessive packet buffering.

## R40 — Scrub coalescing

81 UI targets plus final exact commit:

| Source | Naive setters | Coalesced setters | Naive wall | Coalesced wall |
|---|---:|---:|---:|---:|
| direct Blob video | 82 | 2 | 74.5 ms | 19.6 ms |
| MSE | 82 | 2 | 8.2 ms | 14.7 ms |

Chromium already collapsed the naive MSE burst to a single final `seeked`. Demuxe can still benefit if every `seeking`/setter currently triggers its own source reads, remux restarts, or generation work.

**Integration implication:** scope this to explicit UI scrub intent. Public/programmatic exact seek semantics stay unchanged.

## R41 — Simple SRT → native cues

A small strict converter accepted:

- comma-millisecond SRT timing,
- Unicode,
- multiline cue text,
- overlapping cues,
- `<b>`, `<i>`, `<u>`.

At 1.5/2.75/3.5/5.5 s, `activeCues` matched the expected cue set after seeking. `getCueAsHTML()` preserved the whitelisted inline markup. `<font color="red">` was rejected.

**Integration implication:** define a finite "simple SubRip" profile. Reject styling/placement/encoding constructs outside it rather than degrading them. Embedded extraction remains separate.

## R42 — Recycle transferred append buffers

One 90,419-byte fragment was delivered in 89 × 1 KiB worker messages.

- Fresh mode: **89** ArrayBuffer allocations.
- Pool mode: **1** allocation; the buffer was returned to the worker only after `updateend`.
- Both exposed first buffered output at 9,216 bytes and ended at the same 0.0667–1.0667 s range.
- Wall times were similar (~12.3 vs ~11.9 ms).

**Integration implication:** strong bounded-allocation optimization, but not proof of zero-copy or total CPU savings. Never detach/recycle the Wasm heap; pool only owned output slabs with generation/source ownership.

## Recommended integration order

1. **R35** future audio splice — largest capability improvement building directly on the successful split-buffer work.
2. **R34 + R42** adaptive delivery and output-slab pooling — complementary low-level optimizations.
3. **R38 + R37** bounded in-place recovery for quota and interrupted appends.
4. **R36** compatible queue/loop reuse.
5. **R31 + R32** finite per-track packaging alternatives.
6. **R41** simple native subtitle component.
7. **R39** track-aware production scheduling after integration topology is known.
8. **R40** UI scrub work suppression only where Demuxe currently reacts to every intermediate seek.
9. **R33** stop for now.

## Evidence boundary

These tests establish browser/host primitives in this environment. They do not establish Wasm cost, Safari/Firefox behavior, exact speaker synchronization, sample-perfect splice quality, arbitrary container compatibility, or production-safe source/auth/generation semantics. Those belong in the local Demuxe integration qualification.
