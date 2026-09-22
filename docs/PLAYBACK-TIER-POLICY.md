# Playback tier policy

The public modes remain Native, Hybrid and Software. Automatic startup tries finite admitted plans and retains diagnosed compatibility failures for 60 seconds, scoped to the player, source, presentation requirements and plan (64 entries maximum). Transport, permission, source-identity, cancellation and evidence deadlines are not reusable codec rejection evidence. Manual mode selection remains pinned.

Removing filters, disabling/deselecting subtitles, changing selected tracks, and pausing can request an optional promotion. Changes coalesce for 200 ms. The default policy promotes only while paused, tries only admitted plans ranked ahead of the accepted plan, and keeps the changed setting and accepted session if preparation fails. Volume and clock changes do not trigger promotion. Required feature changes still use ordinary transactional selection.

`player.prepare(['inspector', 'hybrid', 'software'])` also works during playback when no media operation is active. It fetches and compiles immutable assets without opening media or audio devices. Fetches have deadlines and byte limits (32 MiB per engine, 8 MiB for the shared font). This is explicit asset warming, not verified playback.

## Native A/V with mpv subtitles

```js
const player = new Player(container, {
  experimentalMpvSubtitles: true,
});
```

The distinct `native-remux-mpv` plan copies A/V packets for the browser and runs mpv only for embedded subtitles. Initial admission is intentionally limited to inspected local Matroska, a finite duration, one ASS/SSA subtitle track, default gain, stereo output policy, supported packet-copy A/V, MSE and cross-origin isolation. External subtitle attachments, manifests, remote sources and audio adaptation use other existing plans. A selected numeric subtitle is translated by source stream identity.

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
