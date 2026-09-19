# Demuxe media/browser frontier — R132–R145 executed results

**Run date:** 17 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Node 22.16.0, Python 3.13.5, Linux x86-64.  
**Scope:** MSE parser release behavior, worker ownership, codec/container switching, native seek behavior, compressed-fragment caching, and native-frame routing. No Demuxe production source changes.

> **Numbering provenance.** The exact pre-existing R132–R145 proposal text was not recoverable from the Project/Library snapshot at execution time. This run therefore defines and executes a reconstructed continuation batch that follows the current Demuxe research direction. These definitions should become canonical only if accepted into the backlog.

## Outcome summary

| ID | Verdict | Decisive result |
|---|---|---|
| R132 | **PROMISING / STRONG** | With most of a 2 s `mdat` still withheld, Chrome already buffered through ~0.800 s and presented 12 frames through ~0.433 s. Completing the same fragment extended the range to ~2.067 s without error. |
| R133 | **PROMISING** | `moof` and `mdat` were appended in separate `appendBuffer()` calls; Chrome buffered ~1 s and presented frames normally. |
| R134 | **PROMISING PARSER BOUNDARY** | Cutting exactly after the first complete compressed sample surfaced a ~33 ms buffered interval; cutting 37 bytes inside that sample surfaced no range. One sample alone did not produce a frame callback. |
| R135 | **PROMISING** | 500 ms fragmentation reduced bytes in the first complete playable region from **182,325 B to 47,919 B (73.7% less)** while both candidates presented frames. |
| R136 | **BLOCKED BY LAB ORIGIN** | `MediaSource.canConstructInDedicatedWorker` is true and the worker transferred a `MediaSourceHandle`, but attachment never opened from the opaque lab page; an intercepted secure-origin navigation is administratively blocked. |
| R137 | **PARTIAL / BLOCKED** | Main→worker transfer detached all three source `ArrayBuffer`s immediately (777/90,419/96,393 B → 0 B on main), but worker MSE append could not be qualified because of the same handle/origin block. |
| R138 | **PROMISING / STRONG** | One `SourceBuffer` changed from H.264/fMP4 to VP9/WebM via `changeType()` and extended one buffered timeline from ~1.067 s to 4.0 s with no exception/error. |
| R139 | **PROMISING / STRONG** | The same video/MediaSource session played continuously across H.264→VP9, produced frame callbacks on both sides of 2.0 s, and reached clean EOF at 5.0 s. |
| R140 | **FUNCTIONAL; NOT A SPARSE-SEEK OPTIMIZATION** | Cue-less WebM sought to and presented the exact 6.000 s frame, but 64 KiB Range responses walked **1,334,098/1,334,098 B (100.0%)**—effectively the whole file. |
| R141 | **FUNCTIONAL; NOT A SPARSE-SEEK OPTIMIZATION** | No-index fragmented MP4 sought to 4.2 s and played, but the capped Range sequence consumed **579,542/579,542 B (100.0%)**—the entire file. |
| R142 | **PROMISING LOCAL-ONLY** | The same no-index fMP4 as a local Blob sought directly to 4.2 s and presented frames from ~4.233 s onward. Full local bytes change the economics. |
| R143 | **PROMISING / STRONG** | Removing 0–1 s, re-appending the exact original compressed fragment, and seeking back to 0.35 s restored the original buffered range and replayed frames without recreating MSE. |
| R144 | **PROMISING COMPONENT** | After pausing at 1.761 s and removing media through 2.0 s, the displayed decoded image signature stayed identical although buffered media now began at 2.067 s. |
| R145 | **PROMISING / STRONG** | Native decode → `captureStream()` → `MediaStreamTrackProcessor` → pass-through `VideoFrame` → `MediaStreamTrackGenerator` → second `<video>` delivered 66 destination frames from 67 passed frames with no media error and no JS canvas/copy/re-encode stage. |

**Totals:** 10 promising, 2 blocked/partial, 2 functional-but-negative for sparse remote seeking. QA: **41/41 checks passed.**

## R132 — incremental `mdat` sample release

**Question.** Can Chrome's MSE parser release complete coded samples before the entire enclosing `mdat` or movie fragment is present?

The test appended the fMP4 initialization segment, the first `moof`, the `mdat` header, and only ~70 KiB of the first 2-second media payload. The rest of the `mdat` was deliberately withheld.

Before the tail arrived, `SourceBuffer.buffered` already covered **0.066666–0.799999 s** and `requestVideoFrameCallback` reported twelve presented frames from **0.066666 through 0.433333 s**. `readyState` was 4 and playback had advanced to ~0.448 s. Appending the remainder extended the same range to **2.066666 s** and playback continued without a media error.

**Implication.** Demuxe does not necessarily need to materialize a complete fMP4 fragment before starting an MSE append. A streaming muxer can potentially emit fragment metadata and coded sample bytes incrementally, bounded by complete-sample availability.

**Limit.** This is Chromium/H.264/fMP4 behavior for one deterministic fixture. It does not prove arbitrary partial boxes, partial samples, or all codecs are consumable.

## R133 — append `moof` and `mdat` separately

The first 1-second fragment was split at the exact `moof`/`mdat` boundary and delivered in two `appendBuffer()` calls, after the init segment. Chrome buffered **0.066666–1.066666 s**, presented fourteen frames during the observation window, and reported no error.

**Implication.** An application-side gather copy solely to concatenate `moof + mdat` is not required for this route. Demuxe can keep metadata and payload ownership separate at the MSE boundary when that helps its muxer/buffer architecture.

## R134 — complete-sample versus arbitrary byte boundary

A 2-second fragment was cut once exactly after the first H.264 sample and once **37 bytes before** that point.

- Complete-sample cut: buffered **0.066666–0.099999 s**.
- Truncated-sample cut: **no buffered range**.
- Neither case emitted a frame callback within 350 ms; both remained parser-clean with no media error.

This is useful because it separates two facts: Chrome can account for a complete compressed sample before the enclosing `mdat` completes, but one sample may still be insufficient to present a picture because of decode/reorder dependencies or presentation readiness.

## R135 — microfragment size versus startup bytes

The first complete 2-second fragment required **182,325 B** including init; the first complete 500-ms fragment required **47,919 B**. Both presented H.264 frames in Chrome. The smaller fragment therefore reduced the first complete playable region by **73.7%** in this fixture.

This is a byte-to-first-region result, not a universal startup-latency win. Smaller fragments increase box/append frequency and may worsen overhead elsewhere. R132 also shows that a streaming partial-`mdat` strategy can weaken the need to choose very small physical fragments.

## R136 — worker-owned MSE with `MediaSourceHandle`

The environment reports `MediaSource.canConstructInDedicatedWorker === true`. A worker successfully created a `MediaSource` and transferred its handle to the main thread. However, attaching that handle to a video on the opaque `about:blank`/`set_content` lab page produced media error 4 and the worker never received `sourceopen`.

A follow-on attempt to establish an intercepted secure HTTPS document was blocked by the environment's navigation administrator. No browser restriction was bypassed.

**Verdict: BLOCKED, not failed.** The worker parser/append path was never reached, so this run says nothing negative about worker-owned MSE itself.

## R137 — transferable compressed buffers into worker MSE

Even though the worker MSE session could not open, the ownership primitive is decisive. Three compressed buffers transferred main→worker changed from **777, 90,419 and 96,393 bytes** to **0-byte detached ArrayBuffers** on the sender immediately after `postMessage(..., [buffer])`.

That establishes a real no-retained-main-copy handoff primitive. The missing evidence is whether those transferred bytes can be appended and played in the same worker-owned MSE route under a qualified origin.

## R138 — one SourceBuffer, different codec and container

A single SourceBuffer began as `video/mp4; codecs="avc1.64001e"`, buffered H.264/fMP4 through ~1.067 s, then called `changeType()` to VP9/WebM, set `timestampOffset=1`, and appended WebM initialization/media bytes. The final buffered range was **0.066666–4.000 s**, with no exception or video error.

This is more than codec switching: the parser also crossed **ISO BMFF → WebM** inside one MSE presentation.

## R139 — continuous playback through H.264/fMP4 → VP9/WebM

The stronger follow-up put two H.264 fragments first, switched the same SourceBuffer to VP9/WebM at a 2-second offset, appended the VP9 media, ended the MediaSource, and played continuously.

Frame callbacks cover H.264 through **1.900 s**, then VP9 begins at **2.000 s** and continues through **4.967 s**. The element reached `ended=true` at **5.000 s** with no exception or media error.

**Implication.** A Demuxe route need not necessarily tear down the MediaSource or video element when a playlist/asset boundary changes codec/container, provided the exact browser/codecs admit `changeType()` and the application authors a valid continuous timeline.

## R140 — cue-less WebM native seek

The fixture is WebM produced in live mode with no Cues and no finite duration advertised initially. A synthetic HTTPS media response honored browser Range headers but capped each response at 64 KiB. This exercises the media loader's byte-range behavior without making claims about TLS, real-network latency, caches, or proxies.

Chrome initially reported `duration=Infinity`. Setting `currentTime=6` generated `seeking`/`seeked`; after playback, the first video frame callback was **exactly 6.000 s** and frames continued normally.

The cost is the important result: Chrome issued sequential Range requests from byte 0 through the end. The run served **1,334,098 B of a 1,334,098 B file (100.0%)**. Once the scan reached the end, duration became ~7.967 s.

**Verdict.** Functionally valid, but reject it as a sparse remote-seek strategy. Without a useful index, the browser's fallback is essentially a scan.

## R141 — no-index fragmented MP4 native remote seek

A 6-second fragmented MP4 was authored without the usual `mfra` trailer/random-access index. Under the same 64 KiB capped Range harness, Chrome learned the 6-second duration, accepted a seek to 4.2 s, and played to ~4.65 s with `readyState=4` and no error.

But requests were sequential from `bytes=0-` through `bytes=524288-`; capped responses therefore served **the full 579,542-byte file**.

**Verdict.** Correct seeking is not the same as efficient seeking. For remote bytes, this is a negative result and strengthens the case for Demuxe's own source-bound fragment/index map rather than relying on parser scanning.

## R142 — the same no-index fMP4 when all bytes are local

Loaded as a Blob, the same file exposed a seekable 0–6 s interval. Seeking to 4.2 s and playing produced frame callbacks beginning at **4.233333 s** and advanced normally.

**Implication.** Lack of an explicit random-access trailer can be acceptable for a fully local/in-memory object because there is no network byte-fetch penalty. Route choice should therefore depend on byte locality, not just container syntax.

## R143 — compressed-fragment rewind cache

Three 1-second fragments were buffered and playback advanced beyond 2.1 s. The test paused, removed the first second, observed the range begin at **1.066666 s**, then re-appended the original first compressed fragment byte-for-byte. The range returned to **0.066666–3.066666 s**.

After seeking backward to 0.35 s, frame callbacks resumed at ~0.333 s and continued normally. No MediaSource replacement, re-mux, or decoder session rebuild was required by the application.

**Implication.** A bounded compressed-fragment cache can support rewind after MSE eviction cheaply in application memory, which is much smaller than caching decoded video frames for the same time span.

## R144 — evict through a paused current position

Playback paused at **1.760563 s**. A small canvas was used only as an oracle to fingerprint the displayed image before and after `SourceBuffer.remove(0, 2.0)`.

After removal:

- `currentTime` stayed at 1.760563 s;
- the buffered range began at **2.066666 s**, so compressed media no longer covered `currentTime`;
- the displayed-image signature was **identical**;
- `readyState` remained 4 and there was no media error.

**Implication.** Chrome retains the presently displayed decoded image beyond removal of its compressed backing range. This may let a player reclaim compressed MSE bytes more aggressively while paused.

**Limit.** It does not prove the browser retains enough decoder state to resume from that removed point or seek back without re-appending media. It also says nothing about decoder-surface memory reclamation.

## R145 — native frame relay without JS pixel readback

The source video used native `<video>` decoding. `captureStream()` supplied a video track; `MediaStreamTrackProcessor` exposed `VideoFrame` objects; a pass-through `TransformStream` forwarded the frames unchanged to `MediaStreamTrackGenerator`; a second `<video>` rendered the generated track.

Over ~2.2 s, **67 frames entered the transform and 66 were presented by the second video**. Both tracks remained `live`, the destination had `readyState=4`, and neither media element reported an error.

There was **no canvas draw, `VideoFrame.copyTo()`, pixel array, encoder, or compressed re-mux** in the relay path. This proves an application-visible native-frame routing primitive; it does **not** prove zero-copy inside the browser/GPU implementation.

## Cross-experiment conclusions

1. **MSE can be fed more incrementally than “one complete fragment buffer.”** R132–R134 show that complete coded-sample boundaries matter more than completing the whole `mdat`, and R133 removes a mandatory `moof+mdat` gather step.
2. **Small fragments and partial fragments are complementary, not competing ideas.** R135 reduces the first complete region dramatically, while R132 may let Demuxe start before even that region is physically complete.
3. **Codec/container boundaries can be softer than expected.** R138–R139 show a live SourceBuffer transition from H.264/fMP4 to VP9/WebM in one continuous session.
4. **Native parser fallback is not a substitute for a byte index.** R140–R141 both seek correctly but consume essentially the whole remote object. R142 shows why the same syntax can be fine when bytes are already local.
5. **Compressed-cache rewind looks unusually practical.** R143 gives Demuxe a route to combine aggressive MSE eviction with cheap backward recovery.
6. **Decoded-native frames can become an application routing layer.** R145 is a concrete route between native decode and another media track without JS pixel readback, though portability and internal-copy costs require separate qualification.

## Evidence boundary

- Browser results are from one Chromium 144 Linux build and deterministic local fixtures.
- Intercepted HTTPS media responses reproduce Range request/206 semantics inside Playwright; they are **not** evidence about physical network, TLS, CORS, CDN/proxy buffering, or server throughput.
- The worker-MSE cases are blocked by the lab origin/navigation policy; no failure is attributed to the browser feature itself.
- `changeType()` success is specific to the admitted H.264/VP9 profiles and authored timeline used here.
- R145 avoids application pixel readback/re-encode; it does not establish browser-internal zero-copy or hardware surface sharing.
- No host timing is projected as Wasm/player production speedup in this batch.

## Evidence files

- `results/batch.json` — raw browser outcomes for R132–R145.
- `results/r140_playback_probe.json` — strengthened cue-less seek + playback probe.
- `results/qa.json` — machine-readable assertions.
- `results/summary.json` — verdict and derived-metric summary.
- `results/R132-R145-agent-catalog.json` — compact experiment catalog.
- `scripts/run_batch.py` and `scripts/r140_playback_probe.py` — executable harnesses.
- `fixtures/` — deterministic media fixtures used by the batch.