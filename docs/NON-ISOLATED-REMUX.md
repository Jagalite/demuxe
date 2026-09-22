# Non-isolated Native remux

Demuxe can inspect and remux qualified finite files without COOP/COEP when the browser exposes both `WebAssembly.Suspending` and `WebAssembly.promising`. The public mode remains `native` and the execution plan remains `native-remux`. Automatic selection and `nativeRemux: 'always'` use the no-pthread runtime on non-isolated pages.

Admitted packet-copy profiles require a positive finite inspected duration and at most one video track:

| Input | Selected video | Selected audio |
| --- | --- | --- |
| MPEG-TS | H.264 | AAC or none |
| Matroska | H.264 or none | AAC, FLAC, or none |
| Matroska/WebM | VP9 or none | Opus |
| Matroska/WebM | VP8 | Vorbis |
| MP4/MOV | H.264 | none |

At least one playable track is required. AAC tracks must not declare encoder priming. Multiple audio tracks are allowed; the selected track must satisfy the table. Existing packet, parameter-set, timestamp, codec-configuration, MSE support and resource-budget checks still apply. VP9/Opus prefers WebM output to preserve Opus discard padding. FLAC here means copying an existing FLAC track, not converting audio to FLAC.

MP4/AAC edits, declared Matroska AAC priming and H.264/Opus padding do not yet pass exact decoded-output checks. AC-3 and MP3 packet-copy packaging was rejected by the tested Chrome MSE implementation. Those combinations, multiple video tracks, explicit disabled-audio selection, audio adaptation, Native ASS, Hybrid and Software remain outside this route. Unsupported browsers reject controlled remux before starting playback workers. Direct browser playback and Shaka retain their own capability rules.

## Runtime and build

`npm run build:remux-jspi` builds the maintained `native/remux/remux.c` with `DEMUXE_REMUX_JSPI`, FFmpeg pthreads disabled and JSPI async exports. Set `DEMUXE_SDK` and `WEBMPV_EM_CONFIG` as with the existing remux build when the pinned SDK/configuration are elsewhere. The outputs are `web/engine-remux-jspi/remux.mjs` and `remux.wasm`. Standard beta engine builds, binary packaging, build records and `copy-assets` include this runtime. No research-generated C or runtime is imported by production.

The inspector preparation API selects the same runtime as playback. Isolated pages continue using the pthread remux engine. Browser feature detection is a prerequisite, not a browser-version promise; the pinned Emscripten compiler still labels JSPI experimental.

## Ownership and transport

The existing source worker owns `RangeReader` or `LocalFileReader`. Its authorization refresh, origin policy, response bounds, identity checks and cancellation remain in force. A dedicated MessageChannel connects it to the mux worker, with one outstanding read and a maximum 256 KiB transferred response. The source cache remains 2 MiB. The Wasm heap starts at 64 MiB and is capped at 128 MiB; output fragment budgets remain unchanged. These are allocation limits, not total browser-memory measurements.

Only one Wasm operation may be active per mux worker. JSPI suspends synchronous FFmpeg AVIO until the source response arrives. The read bridge copies into the current Wasm heap after suspension. Seeking/replacement creates a new generation and source identity is retained across seeks. Close, cancellation and destruction terminate both workers, including suspended work; stale generations cannot publish buffers. Independent players have independent heaps and channels.

## Validation

Run `npm run test:remux-jspi:expansion` for the expanded public Player profiles, exact decoded pixels/PCM, seeking and explicit audio selection. `ISOLATED=1 node tests/remux-jspi-expansion.mjs` checks the same profiles using pthreads. `SCREEN=1 node tests/remux-jspi-expansion.mjs` bypasses public admission to investigate remaining runtime limitations; screening success is not qualification.

Run `npm run test:remux-jspi` for the non-isolated public Player suite and `ISOLATED=1 node tests/remux-jspi.mjs` for the corresponding pthread regression suite. `BROWSER=firefox` exercises the installed Firefox runtime; when JSPI is absent only the capability-rejection contract applies.

The suite uses actual maintained workers and Wasm, remote range reads and local Files. It covers playback, forward/backward seeking on a 24-second TS larger than the source cache, source replacement, independent players, unsupported profiles/features, authorization refresh, changed-source rejection, cancellation during inspection and an observed pending Wasm source read (with its response withheld), an initialization-only negative control, and worker cleanup. Captured public Player MP4 output is independently decoded with host FFmpeg and compared exactly with source pixels and PCM. Fixtures are generated locally with FFmpeg; the production test has no dependency on historical research artifacts. Test results are appended under `results/remux-jspi/`.

These checks do not establish Safari/mobile support, physical A/V output, prolonged playback endurance or a speed improvement over pthread remux. Release publication still requires the repository's clean-source and exact-package gates.

For an exact-package run, set `ARCHIVE=build/beta/demuxe-<version>.tgz` when running the suite. Release verification requires that passing Chrome report through `scripts/verify-beta-release.py --jspi <result.json>`; a source-checkout run cannot satisfy that gate.
