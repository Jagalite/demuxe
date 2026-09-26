# Playback tier policy

The public modes remain Native, Hybrid and Software. Automatic startup tries finite admitted plans and retains diagnosed compatibility failures for 60 seconds, scoped to the player, source, presentation requirements and plan (64 entries maximum). Transport, permission, source-identity, cancellation and evidence deadlines are not reusable codec rejection evidence. Manual mode selection remains pinned.

Removing filters, disabling/deselecting subtitles, changing selected tracks, and pausing can request an optional promotion. Changes coalesce for 200 ms. The default policy promotes only while paused, tries only admitted plans ranked ahead of the accepted plan, and keeps the changed setting and accepted session if preparation fails. Volume and clock changes do not trigger promotion. Required feature changes still use ordinary transactional selection.

`player.prepare(['inspector', 'hybrid', 'software'])` also works during playback when no media operation is active. It fetches and compiles immutable assets without opening media or audio devices. Fetches have deadlines and byte limits (32 MiB per engine, 8 MiB for the shared font). This is explicit asset warming, not verified playback.

## Native video with mpv audio

The finite `native-video-mpv-audio` execution plan sits before Hybrid in automatic selection. It copies only selected video packets through the existing remux producer to MSE and presents them with a browser video element. A separate bounded source reader lets mpv demux and decode the selected audio with `vid=no` and `sid=no`; the existing PCM ring and an AudioWorklet own output. There is no mpv video chain, WebCodecs video worker or visible Hybrid canvas. Diagnostics expose the plan ID, component ownership, PCM timeline, corrections and fallback reasons.

Current automatic admission requires an inspected finite random-access file, selected video and audio tracks, a browser MSE video configuration that is not rejected, cross-origin isolation, Web Audio, available selective engine assets, stereo output and default gain. Local File inputs and HTTP(S) file URLs use the same service plans. URL readers retain the inspector's source identity, credentials, allowed origins and authorization refresh through RangeReader; manifests and explicit demuxer overrides retain their existing routes. Embedded subtitles use `native-video-mpv-audio-subtitles` when the subtitle service is available. External subtitle composition, filters, tone mapping and audio transforms remain subject to the existing plan restrictions. An explicit mode selection stays pinned. Actual browser output and PCM consumption are verified at runtime; diagnosed compatibility failures retain Hybrid fallback. Source permission, identity, transport and cancellation failures remain terminal.

URL service support is implemented in source but has not yet been built or runtime-qualified. The existing local-file qualification reports retain their original codec and fixture scope; their CPU figures do not establish URL performance.

The video element is the presentation clock. Each PCM block carries its media timestamp, rate and generation. A request to change rate becomes effective when its timestamped PCM boundary is audible, normally about 0.35–0.42 seconds later, while playback continues. Public `playbackRate` reports the effective visible rate; diagnostics separately show requested and pending rates. Routine rate changes do not seek. A seek increments the generation, stops old PCM publication, clears queued audio and establishes a new browser/audio baseline. EOF drain callbacks are reported separately from active playback underruns. Track switching reopens the source under the newly selected plan; no in-place decoder switch is assumed.

This plan has two source readers and two Wasm services during preparation, so startup and memory can differ from Hybrid. The separate engine is built by `python3 scripts/build-selective-audio.py` and is included in the standard beta engine/package closure. Current qualification is Chrome on macOS; broader browser, subtitle composition, channel layout and codec admission require their own evidence.

## Native A/V with mpv subtitles

```js
const player = new Player(container, {
  experimentalMpvSubtitles: true,
});
```

The distinct `native-remux-mpv` plan copies A/V packets for the browser and runs mpv only for embedded subtitles. Admission requires an inspected finite file, selected embedded subtitles, available service assets, default gain, stereo output, browser-compatible packet-copy A/V, MSE and cross-origin isolation. Local files may also use `native-direct-mpv`. Subtitle-bearing URLs use controlled remux so both readers enforce the inspected source identity. External subtitle attachments, manifests and audio adaptation retain their existing restrictions. A selected numeric subtitle is translated by source stream identity.

The service retains mpv track selection, attached fonts, subtitle decoding, libass, seeking and subtitle timing. It receives the accepted media clock. It uses a separate range-reading worker, a 64 MiB initial / 128 MiB maximum Wasm heap, 4 MiB forward / 1 MiB backward packet settings and a 2 MiB subtitle tile export budget. It verifies that no mpv audio or video output chain exists. Reads are blocked between timestamp updates to avoid uncontrolled subtitle-only demux readahead. Browser canvas/GPU allocations are additional. The entire movie is never copied into the service's Wasm filesystem.

Container fullscreen is supported; video-element-only fullscreen, picture-in-picture and remote playback cannot carry the separate subtitle surface. Those video-element output mechanisms are disabled or rejected. The route is opt-in: the original HEVC/ASS fixture passes Chrome and installed Firefox, but a synthetic open-GOP HEVC fixture still stalls in Firefox's Native seek at 13 seconds. General subtitle fidelity, long-duration playback and release qualification are not implied by those passes.

Build the optional engine with `npm run build:subtitles`. It uses the existing pinned mpv build under `build/`; `DEMUXE_MPV_BUILD_ROOT` can point to an existing build checkout. External-cache mpv objects and the libxml catalog object are rebuilt in isolation with normalized configuration paths; cached sources and libraries are not modified. The build records input/artifact hashes in `build/subtitle-service/manifest.json`. `python3 scripts/package-beta.py --mpv-subtitles` includes the runtime in a local beta package. Tagged release packaging with this option is blocked until clean-source and exact-package qualification are supplied.

## Opt-in preparation while playing

```js
const player = new Player(container, {
  experimentalMpvSubtitles: true,
  experimentalBackgroundPromotion: {maxKnownBytes: 512 * 1024 * 1024},
});
```

This permits optional Native candidates to prepare while the accepted player continues playing. It does not prepare speculative Hybrid/Software decoders. There is one candidate, a separate cancellation controller, and serialized ownership at commit. Incoming media operations abort optional preparation immediately rather than waiting for it to finish. Failed or obsolete candidates are disposed; no stale candidate may commit.

Candidate output stays silent during preparation. At handoff the accepted player pauses briefly, its latest position is captured, the candidate seeks and verifies that position, and visible/audio ownership transfers. This is not a gapless handoff. The accepted player resumes if preparation or alignment fails.

The budget reserves maximum explicit candidate Wasm heaps and packet queues plus the accepted player's measured allocations. It is a known-allocation admission limit, not a whole-browser memory cap; browser decoders, GPU resources and compiled-code memory are opaque. Active-player buffering, newly dropped frames or budget growth cancel preparation. In-play warming and preparation consume CPU and I/O even when fetch priority is low.

## Checks

Generate the synthetic browser fixture with `python3 experiments/mpv-subtitle-service/prepare.py` (requires FFmpeg with libx265), then build the playback engines and optional subtitle service before running browser checks.

- `node --test tests/tier-policy.mjs tests/plan-admission.mjs tests/runtime-capability-contracts.mjs tests/engine-preparation.mjs tests/native-seek-frame-race.mjs tests/native-selection.mjs`
- `node tests/tier-promotion-browser.mjs`: paused promotion, no-op, required return, manual pin, advancing old playback, latest-clock handoff, warming, seek preemption, rollback and negative-evidence backoff.
- `node tests/mpv-subtitle-service.mjs`: Chrome route, caption presence/absence, seeks, no A/V chains and worker cleanup. `SOURCE` accepts the original local MKV; no source video images are saved.
- `node tests/mpv-subtitle-firefox.mjs`: installed Firefox through BiDi, numeric caption checks. The default synthetic fixture currently reproduces the known Native seek failure; the original file passes with `SOURCE` set. No HEVC preference override is applied.
