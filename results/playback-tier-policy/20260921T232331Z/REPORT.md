# Playback tier implementation and validation

Implemented locally: a finite Native-remux + mpv-subtitle plan, configuration-scoped negative compatibility evidence, event-driven optional promotion, in-play immutable asset warming, and opt-in Native preparation while accepted playback continues. Public modes remain Native / Hybrid / Software. New subtitle and overlapping-preparation routes are opt-in; this is not a production-default or release qualification.

## Implemented behavior

- `experimentalMpvSubtitles: true` admits `native-remux-mpv` for an inspected finite local Matroska with one ASS/SSA track, supported original A/V packets, MSE and isolation. mpv retains attached fonts, subtitle decoding, libass and seek logic, with no audio/video output chain. Independent range reads replace the prototype's whole-file WasmFS copy.
- Subtitle service: 64 MiB initial / 128 MiB maximum linear memory; bounded range transport and 2 MiB subtitle tile export; one render request in flight. Demux reads are blocked between timestamp updates. Decoder preparation, source-track identity, stale bitmap rejection, caption visibility, geometry and thread cleanup are integrated.
- Compatibility history: 64 entries, 60-second expiry, scoped by source identity, settings, selected tracks and plan. Transport, permission, source changes, cancellation and evidence deadlines are not cached as codec failures.
- Optional promotions coalesce for 200 ms, compare admitted plans against the current plan and run while paused by default. Disabling/deselecting subtitles and removing filters retain the requested setting even if promotion fails. Required subtitle restoration selects a capable route. Manual pinning remains effective.
- `prepare()` permits explicit immutable warming during playback. It has asset deadlines and byte ceilings and creates no media or audio workers.
- `experimentalBackgroundPromotion: {maxKnownBytes: ...}` permits one silent Native candidate while the accepted player advances. User operations cancel its controller; commit briefly pauses old playback, captures the latest clock, aligns/verifies, and transfers ownership. Active-player starvation, new frame drops and known-allocation budget growth cancel preparation. Browser/GPU/compiled-code memory remains outside the known linear-memory/packet budget. No gapless claim.

## Executed validation

| Check | Result |
|---|---|
| Build, TypeScript and license boundaries | Pass |
| Focused policy/admission/evidence/preparation/seek/selection tests | 42/42 |
| Existing Chrome public API suite | 20/20 on final run |
| Promotion browser tests | Pass: paused promotion, no-op, required subtitle return, deselection/auto restoration, manual pin/return to auto, overlapping progress, latest-clock handoff, warming, seek preemption, rollback, backoff and filter removal with initially absent inspection |
| Chrome synthetic subtitle route | Pass: playback, caption presence/absence at 2, 5, 13, 2, 39 seconds, no A/V chains, complete worker cleanup and cancellation during worker initialization |
| Original `software_test_slow.mkv`, Chrome | Pass: captions and seeks at 5, 12, 31, 950, 5 seconds; no A/V chains; 64 MiB subtitle heap; worker cleanup |
| Original file, installed Firefox 156, default HEVC policy | Pass with final normalized engine: 37 playback frames, caption presence/absence and all five seeks; no A/V chains; overlay removed on destroy |
| Optional local beta package | See `package.log` and `package-verification.json`; source-path checks remain enforced and tagged-release qualification remains blocked |

No original-file video images or subtitle text were saved. Caption checks counted pixels numerically. Synthetic caption checks verify presence and empty intervals; they are not a new exhaustive pixel/fidelity comparison against Software. Earlier laboratory exact-mask evidence remains separate.

The earlier Firefox original-file run measured roughly 179–291 ms per seek. A subsequent run using the final normalized engine while other validation ran measured 217–656 ms. These are functional-run timings, not an isolated performance comparison or a CPU-improvement claim. The subtitle heap stayed at 64 MiB. Removing eager demux reading substantially reduced observed source reads in this workload, but timing-dependent I/O totals are not a portable performance estimate.

## Remaining Firefox qualification failure

The synthetic `rejected-bframes.mkv` opens and plays in installed Firefox but stalls seeking to 13 seconds. At failure the Native element has `seeking=true`, `currentTime=14` (one-second mux bias), `readyState=1`, and buffered data covering approximately 11.333–41.031 seconds. No MSE error is reported. This reproduces with buffered seeking both enabled and disabled. The subtitle service is suspended during that A/V seek; fallback reaches Software.

The synthetic seek anchor is HEVC NAL type 21 (CRA), followed by type 8 (RASL). The original file's inspected anchor is type 20 (IDR). This is a distinguishing observation, not a confirmed cause. An experiment suppressing only the restarted CRA's leading RASL packets did **not** fix the stall. Its patch is retained in `reverted-rasl-experiment.patch`; production remux source was restored exactly and rebuilt. The failed Firefox logs are retained alongside passing original-file logs.

General open-GOP HEVC seek qualification, all subtitle formats/tracks, remote subtitle-service transport, long-duration endurance, physical audio output and full release/source correspondence remain outside the passing evidence. The new subtitle route therefore remains explicit opt-in.

## Build and evidence notes

The service initially linked a legacy external cache containing absolute host paths. Packaging correctly rejected it. The builder now recompiles external-cache mpv objects and the libxml catalog object into isolated normalized artifacts, leaves the original cache untouched, and checks the linked engine for path leakage. No binary string patching or package-check bypass was used. The normalized engine was retested in Chrome and installed Firefox.

The first existing public-API run had 19 passes and one test false positive: its `/wasm/` resource-name regex counted the ordinary `wasm-player.js` adapter import as a Wasm engine. The test now matches `.wasm` assets explicitly; the complete final suite passed 20/20. Original logs are retained.

Current implementation/artifact hashes are in `source-hashes.json`; the optional engine build record is `subtitle-build.json`. Files remain local and uncommitted. No push, publication, browser HEVC preference change, or production-default enablement was performed.
