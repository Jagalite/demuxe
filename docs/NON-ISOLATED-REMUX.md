# Non-isolated Native remux

Demuxe can inspect and remux a finite MPEG-TS file without COOP/COEP when the browser exposes both `WebAssembly.Suspending` and `WebAssembly.promising`. The public mode remains `native` and the execution plan remains `native-remux`. Automatic selection and `nativeRemux: 'always'` use the no-pthread runtime on non-isolated pages.

The admitted profile is one AVC/H.264 video track and one AAC audio track, with a positive finite inspected duration. The existing TS packet, parameter-set, IDR, timestamp and ADTS checks still apply. MP4/AAC priming, other containers/codecs, audio-only/video-only inputs, multiple A/V tracks, audio adaptation, Native ASS, Hybrid and Software are not admitted by this non-isolated route. Unsupported browsers reject controlled remux before starting playback workers. Direct browser playback and Shaka retain their own capability rules.

## Runtime and build

`npm run build:remux-jspi` builds the maintained `native/remux/remux.c` with `DEMUXE_REMUX_JSPI`, FFmpeg pthreads disabled and JSPI async exports. Set `DEMUXE_SDK` and `WEBMPV_EM_CONFIG` as with the existing remux build when the pinned SDK/configuration are elsewhere. The outputs are `web/engine-remux-jspi/remux.mjs` and `remux.wasm`. Standard beta engine builds, binary packaging, build records and `copy-assets` include this runtime. No research-generated C or runtime is imported by production.

The inspector preparation API selects the same runtime as playback. Isolated pages continue using the pthread remux engine. Browser feature detection is a prerequisite, not a browser-version promise; the pinned Emscripten compiler still labels JSPI experimental.

## Ownership and transport

The existing source worker owns `RangeReader` or `LocalFileReader`. Its authorization refresh, origin policy, response bounds, identity checks and cancellation remain in force. A dedicated MessageChannel connects it to the mux worker, with one outstanding read and a maximum 256 KiB transferred response. The source cache remains 2 MiB. The Wasm heap starts at 64 MiB and is capped at 128 MiB; output fragment budgets remain unchanged. These are allocation limits, not total browser-memory measurements.

Only one Wasm operation may be active per mux worker. JSPI suspends synchronous FFmpeg AVIO until the source response arrives. The read bridge copies into the current Wasm heap after suspension. Seeking/replacement creates a new generation and source identity is retained across seeks. Close, cancellation and destruction terminate both workers, including suspended work; stale generations cannot publish buffers. Independent players have independent heaps and channels.

## Validation

Run `npm run test:remux-jspi` for the non-isolated public Player suite and `ISOLATED=1 node tests/remux-jspi.mjs` for the corresponding pthread regression suite. `BROWSER=firefox` exercises the installed Firefox runtime; when JSPI is absent only the capability-rejection contract applies.

The suite uses actual maintained workers and Wasm, remote range reads and local Files. It covers playback, forward/backward seeking on a 24-second TS larger than the source cache, source replacement, independent players, unsupported profiles/features, authorization refresh, changed-source rejection, cancellation during inspection and an observed pending Wasm source read (with its response withheld), an initialization-only negative control, and worker cleanup. Captured public Player MP4 output is independently decoded with host FFmpeg and compared exactly with source pixels and PCM. Fixtures are generated locally with FFmpeg; the production test has no dependency on historical research artifacts. Test results are appended under `results/remux-jspi/`.

These checks do not establish Safari/mobile support, physical A/V output, prolonged playback endurance or a speed improvement over pthread remux. Release publication still requires the repository's clean-source and exact-package gates.

For an exact-package run, set `ARCHIVE=build/beta/demuxe-<version>.tgz` when running the suite. Release verification requires that passing Chrome report through `scripts/verify-beta-release.py --jspi <result.json>`; a source-checkout run cannot satisfy that gate.
