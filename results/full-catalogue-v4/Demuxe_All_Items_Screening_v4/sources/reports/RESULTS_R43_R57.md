# Demuxe R43–R57 standalone route lab

**Date:** 2026-09-17  
**Environment:** Chromium 144.0.7559.96 headless on Debian 13; native FFmpeg 7.1.5; Node 22.16.0; Python Playwright.  
**Scope:** standalone browser/host-media viability. Demuxe production source and automatic routing were not modified. Host results do not qualify Wasm/mpv cost or other browsers.

## Verdict matrix

| ID | Verdict | Standalone result |
|---|---|---|
| **R43** | **STRONG PROMISE** | H.264 360p→720p→360p replacement worked on one retained MediaSource with the same audio SourceBuffer when commits were aligned to real random-access timestamps (~4.0667/8.0667 s). Video dimensions changed at both boundaries, audio stayed continuous, and no `waiting` event occurred. A rounded 4.000 s commit produced a gap/stall, proving the transaction must be keyframe/timeline aware. |
| **R44** | **STRONG PROMISE / BOUNDED PROFILE** | A source window containing only the 2–8 s GOP region produced the same first presented frame for a requested 3.35 s start as the full source (`mediaTime≈3.3667`), while admitting 1,508,420 B vs 2,949,802 B (~48.9% fewer bytes). Setting only `appendWindowEnd=7.65` bounded the end to the last covering frame (~7.60 s). A broken `appendWindowStart=3.35` control lost preroll and first presented ~4.1 s. |
| **R45** | **PROMISING / MAY ALREADY EXIST ELSEWHERE** | A source-bound fragment map reduced top-level header inspections from 70 to 25 for six repeated seeks including first-time index construction (~64% fewer), detected changed-source and corrupted-entry controls, and directly appended/decoded the mapped 20.066–24.066 s fragment. Must compare against Demuxe/mpv existing indices before implementing. |
| **R46** | **PROMISING PROTOTYPE, NOT QUALIFIED** | Ordinary fast-start MP4 fails direct MSE append here, but a ~7 KiB standalone JS adapter parsed sample tables and built split fMP4 in median ~19.1 ms for a ~3 MB H.264/AAC file. All 360 H.264 payloads were byte-identical; AAC payloads were byte-identical after explicit priming removal; malformed top-level sizes were rejected. Chromium played and sought the output. **Blocker:** direct source presents frame 0 at `mediaTime=0`, while the prototype's first presented B-frame is ~0.0333 s; later seek mapping at 8 s matches. Edit/preroll semantics must be fixed before integration. |
| **R47** | **PROMISING** | For a 429,646 B fragment, scatter delivery used 0 application payload-copy bytes versus 429,646 B for concatenation, with median append completion ~2.9 ms vs ~2.8 ms, but required 9 appends instead of 1. A 50 MiB backing buffer could be detached immediately after `appendBuffer()` and the fragment still completed, showing this Chromium copies the supplied bytes at the MSE boundary rather than pinning the source view through `updateend`. |
| **R48** | **STRONG PROMISE** | 10,020 logical simple cues inserted eagerly took ~12.1 ms and left 10,020 live `VTTCue`s. A ±30 s moving window took ~0.29 ms per load and kept at most 123 live cues (~98.8% fewer), while sampled active-cue sets including long overlaps matched the full logical index exactly. |
| **R49** | **MIXED / POLICY-SPECIFIC** | With equal 1× reserve, wall-clock targeting did not improve an abrupt 4× rate jump in the deterministic producer model. During an 8 s 0.5× period where viewing stopped, it preserved the same progress/stalls while cutting discarded track-ahead work from 16.64 to 8.32 track-seconds (50%). Earlier overly-small 1× tuning performed worse, so hysteresis/minimums matter. |
| **R50** | **NOT WORTH A NEW EVICTION SUBSYSTEM** | Chromium already moved the actual retained start to the next random-access point. On 4 s GOP video, `remove(0,14.5)` and `remove(0,16)` both left buffered media starting ~16.0667 s; on 1 s GOP input the 14.5 s removal left ~15.0667 s. GOP metadata is useful to predict/user-policy rewind coverage, but the browser already enforces the decode-safe boundary. |
| **R51** | **STRONG PROMISE** | Tested ALAC and TrueHD 16/24-bit stereo are unsupported unchanged by this Chromium, while FLAC-in-MP4 is supported. Normal ALAC/TrueHD decode → FLAC → decode was SHA-256 sample-identical to the generated reference PCM for all four cases. Median host conversion: ALAC ~0.082–0.083 s for 8 s (~96–98× real time); TrueHD ~0.186–0.202 s (~40–43×). Split copied-video + adapted-FLAC playback and seeking worked for both sources. |
| **R52** | **STRONG PROMISE** | Original AAC tracks switched 44.1→48 kHz and 48→44.1 kHz while retaining video. Marker frequency changed correctly in both directions ~0.20 s after the T=4 s transaction; no `waiting` occurred at the switch boundary (one run had only the initial t=0 wait). No application-side resampling was introduced. |
| **R53** | **PROMISING** | Coalescing a 240-event gain gesture to 60 Hz audio-clock ramps reduced scheduled control events 241→97 (~59.8%). During the gesture region, maximum adjacent sample jump fell ~86.9%; RMS derivative fell ~6.4%. The explicitly urgent mute remained immediate and exact (`atMutePeak=0`). This is a control-quality/dispatch optimization, not a codec-splice repair. |
| **R54** | **STRONG PROMISE** | With host FFmpeg paced at 2× source rate, `cluster_time_limit=250` released the first 4 KiB at ~58 ms vs ~321 ms default and first 32 KiB at ~659 ms vs ~821 ms. At 10× pacing the same direction held (~56 ms vs ~114 ms for first 4 KiB). All live-remux candidates had identical Opus packet/timing sequences to each other and decoded to identical PCM as the source. Chromium could form a joint A/V buffered interval from the first 4 KiB for every candidate, so the gain is earlier **producer release**, not a lower browser parser threshold. |
| **R55** | **PROMISING ONLY FOR REVISITS** | On a one-way preview trace, caching had no hits and was slower (~94.5 vs 76.9 ms). On a back-and-forth trace, an 8-image cap reduced decoder seeks/captures 16→6, produced 10 cache hits, and reduced wall time ~119.7→80.3 ms (~33%), retaining ~346 KiB at the end. Enable only for explicit preview/revisit behavior. |
| **R56** | **NOT WORTH A NEW TIMELINE SUBSYSTEM FOR FLOAT ERROR** | Repeated full-precision double addition of a deliberately fractional 3.370033333 s item accumulated only ~4.7 ns error after 10,000 items and ~67.6 µs after 1,000,000. Premature rounding is the real hazard: rounding each item to milliseconds would accumulate ~0.333 s over 10,000 items. Keep source ticks/rationals where available and avoid rounding, but JavaScript double accumulation alone does not justify a new subsystem. |
| **R57** | **STRONG PROMISE / INTERNAL CHANNEL PRESERVATION** | 24-bit 48 kHz 5.1 PCM→FLAC→PCM was sample-identical. Direct FLAC, audio-only MSE FLAC, and split H.264+FLAC MSE each exposed six distinct analyzer outputs at the six authored tones (~300/430/560/690/820/950 Hz). The intentional stereo-downmix control exposed only two non-silent splitter outputs. This qualifies internal browser channel preservation in this environment, **not physical 5.1 speaker output**. |

## Key details

### R43 — video-only configuration transaction

The first attempt committed at rounded times 4.0 and 8.0 s. It created disjoint video ranges around the actual H.264 random-access timestamps and stalled. Re-running at the actual keyframe starts (~4.066666 and ~8.066666) produced one continuous video range `0.066666–12.066666`, two `resize` events at the expected boundaries, and no waiting events. Audio stayed on the same 48 kHz AAC buffer and its marker remained stable.

**Implication:** video reconfiguration is viable, but the plan must commit on an established codec/timeline boundary rather than an arbitrary requested clock instant.

### R44 — bounded excerpt with preroll

The full fMP4 source was ~2.95 MB. The bounded candidate used init plus only the three fragments covering roughly 2–8 s (~1.51 MB). Both full and bounded candidates, after seeking to 3.35 s, presented the same first covering video frame at ~3.366666 s. The broken control set `appendWindowStart=3.35` before feeding required preroll; its first video frame was ~4.1 s, proving that visibility trimming cannot be used to delete decode prerequisites.

`appendWindowEnd=7.65` preserved the correct requested start and left buffered media through ~7.60 s, the final complete covering frame in this 30 fps source. This is playback-range behavior, not frame-exact exported editing.

### R45 — fragment seek map

The 30 s / 4 s GOP fixture contained eight moof+mdat fragments. The saved source identity includes byte length plus SHA-256. The prototype validates the mapped offset still begins with `moof`; same-name changed bytes and a deliberately shifted/corrupt entry were rejected. A target around 20.2 s appended only init + the 20.066–24.066 s fragment and decoded moving video around that target.

**Caveat:** this is only useful if Demuxe/mpv does not already expose an equivalent source-bound random-access index.

### R46 — narrow JavaScript MP4 adapter

The prototype parses `stsd/stts/ctts/stsc/stsz/stco|co64/stss`, track/edit metadata and the original compressed sample spans. It creates per-track fMP4 init/media output, explicitly removes the AAC priming sample represented by the source edit, and trims the final AAC sample duration to the 12 s visible interval.

Positive evidence:
- ordinary MP4 direct append to MSE failed while host-FFmpeg fMP4 succeeded;
- JS-built split fMP4 succeeded in Chromium;
- H.264 payload hashes: 360/360 identical;
- AAC payload hashes after explicit priming removal: 563/563 identical;
- malformed top-level box size is rejected;
- median adapter execution ~19.1 ms over 10 warm-file runs; script size ~7 KiB.

Remaining blocker: first-frame B-frame/edit semantics are not yet identical to direct playback. Direct first `requestVideoFrameCallback.mediaTime` was 0.0; JS split first callback was ~0.033333 s, although both matched around an 8 s seek. This candidate must remain experimental until that is solved with principled edit/decode-preroll handling.

### R47 — header/payload-view delivery

The scatter mode appended nine views (moof, mdat header and bounded payload views) without first copying the full 429,646-byte fragment into a new application buffer. Median small-fragment timing was essentially unchanged from a single concatenated append, but the call count rose from one to nine. This suggests a bounded gather size is important.

A separate 50 MiB backing-buffer control detached the entire backing ArrayBuffer immediately after `appendBuffer(view)` and still reached the identical final buffered range. That establishes that this Chromium copied the passed bytes before returning from `appendBuffer`; it does not imply zero-copy inside MSE or the decoder.

### R48 — native-cue virtualization

The moving window used interval overlap (`cue.end > windowStart && cue.start < windowEnd`), not start-time-only lookup, so long cues crossing the window were retained. At seven sampled times—including backward jumps—all expected active logical cues were represented by the window-loaded browser cue set.

Product integration must decide whether public APIs require `TextTrack.cues` to contain the complete subtitle file. If so, this optimization cannot silently change that surface.

### R49 — playback-rate-aware reserve

A rate-aware reserve is useful mainly as a bounded-work policy, not as a magic fast-rate anti-stall controller. With the same 8 s reserve at 1×, the 4× jump was producer-limited and behaved identically. At 0.5×, a wall-clock reserve halved ahead/discarded work while preserving playback outcome in the stop-after-slow scenario.

Earlier testing with a smaller 1× reserve caused extra stalls after a rate jump; any production policy needs minimum reserve, hysteresis and hard byte caps.

### R50 — keyframe-aware removal

Browser removal already exposed the next playable RAP rather than the requested arbitrary timestamp. For the 4 s GOP source, removing through 14.5 s caused the retained range to begin at 16.066666 s—the same result as requesting removal through 16 s. Therefore an index can help Demuxe choose/predict rewind policy, but should not duplicate the browser's decoder-safe removal mechanism.

### R51 — integer-lossless source profiles

All four generated paths passed raw PCM SHA-256 equality:
- ALAC 16-bit → decoded PCM → FLAC → PCM;
- ALAC 24-bit → decoded PCM → FLAC → PCM;
- TrueHD 16-bit → decoded PCM → FLAC → PCM;
- TrueHD 24-bit → decoded PCM → FLAC → PCM.

Unlike AC-3/DTS fixed-decoder experiments, no alternate decoder semantics were needed: the normal decoders reproduced the integer references exactly in this corpus. Chromium rejected unchanged ALAC and TrueHD but played FLAC-in-MP4. Full split-video + FLAC destination tests passed for both adaptation sources.

Do not generalize TrueHD to Atmos/object metadata or arbitrary multichannel layouts from this stereo pilot.

### R52 — sample-rate-preserving audio switches

The media remained one split-MSE presentation. The source AAC packets were not resampled by the application. The Web Audio context itself ran at 44.1 kHz in this environment, so eventual browser/device resampling is outside the preservation claim. Both authored tones appeared at the correct pitch after switching, with video buffer identity retained.

### R53 — gain gesture automation

The OfflineAudioContext comparison intentionally kept emergency mute immediate. Ordinary gesture updates were coalesced to roughly display cadence and ramped over 5 ms on the AudioContext clock. This substantially reduced gesture-region sample discontinuities and update count. Whether those semantics should be a default public-volume behavior is a product/API decision.

### R54 — WebM cluster release

All live-remux outputs (default, 250 ms, 1000 ms) contained 601 Opus packets with identical packet hashes/timestamps to each other. They also decoded to the same PCM SHA-256 as the original Opus source. The WebM remux normalizes the source's negative Opus packet timestamp using codec-delay semantics; compare decoded output/complete timing rather than raw source PTS alone.

At 2× paced input, 250 ms clusters materially advanced byte availability without changing total run time. Prebuilt incremental MSE tests showed all candidates become jointly A/V-buffered with the first 4 KiB, so smaller clusters matter because FFmpeg emits those bytes earlier.

### R55 — bounded preview cache

The cache is clearly workload-dependent. It is counterproductive for one-way scans and beneficial for reversals/revisits. Any integration should be attached to explicit preview intent, use a hard byte/object cap, and clear on source/video-selection/geometry generation changes. Final committed playback seeking remains authoritative and uncached.

### R56 — integer ticks versus doubles

Do not create an artificial rounded-float baseline. Full JavaScript doubles are already sufficiently precise for realistic queue lengths in this arithmetic test. Preserve original integer timestamps and rescale carefully because they are authoritative source data, not because ordinary double addition produces material queue drift.

### R57 — six-channel FLAC

The FLAC file retained all 6,912,000 decoded 24-bit bytes exactly and probed as 48 kHz / 6 channels. The media-element source node's exposed `channelCount` property remained `2`, yet a six-output `ChannelSplitterNode` recovered six independent authored frequencies in direct and MSE playback. The stereo-downmix negative control left splitter outputs 2–5 silent. Therefore the property alone is not a reliable channel-preservation diagnostic.

Physical speaker routing, OS mixing, channel-name semantics across platforms, and maintained Demuxe >2-channel admission remain local qualification work.

## Recommended local integration order

1. **R43** — per-track video transaction at established RAPs.
2. **R51 + R57** — genuinely integer-lossless adaptation inputs and multichannel destination feasibility.
3. **R48** — simple-caption cue virtualization if public cue-list semantics allow it.
4. **R54** — WebM cluster release tuning for the already-working mixed-container route.
5. **R52 + R53** — audio-format transitions and gain automation.
6. **R47** — lower-copy application assembly, only if real FFmpeg/output boundaries expose separated owned spans.
7. **R44 + R45** — bounded excerpt/source index, after checking maintained source/index capabilities.
8. **R55** — preview cache only for revisit-heavy UI traces.
9. **R49** — rate-aware work budgeting, narrowly; do not expect it to cure producer-limited fast playback.
10. **R46** — keep experimental until first-frame/edit/preroll semantics match direct playback.
11. **R50 / R56** — do not add standalone subsystems based on these experiments.

## Evidence boundary

These results prove primitives only in the stated Chromium/FFmpeg environment. They do not establish pinned Demuxe Wasm performance, Firefox/Safari behavior, HTTP/CORS/security semantics, physical audio output, source authorization, streaming-controller behavior, or production-safe generation/cancellation ownership. All local integration must retain the existing correctness/fidelity gates and strongest fallback.
