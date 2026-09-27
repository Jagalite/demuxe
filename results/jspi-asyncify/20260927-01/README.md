# JSPI and Asyncify: first isolated component milestone

Completed 2026-09-27 in `/Volumes/seed2/Projects/demuxe-jspi-asyncify-20260927`, branch `experiment/jspi-asyncify-20260927`, based on `e7a8d02d126e381b50af9836b202f3d5186082ea`.

Both runtimes now build and execute actual standalone FFmpeg media operations. The final component matrix passes. Player integration, full mpv services and release qualification remain pending. All changes are local and uncommitted under `experiments/jspi-asyncify/` and `results/jspi-asyncify/`; no Player API files, production routing or served engines were changed by this work.

## Results

| Layer / run | Passed | Evidence |
|---|---:|---|
| Rebuilt raw mpv infrastructure / source bridge | 94/94 | [dual result](local-dual-02.json) |
| Rebuilt continuation and deliberate-fault oracles | 27/27 | [continuation result](local-continuations.json) |
| Existing host/build/audit guards | 58/58 | [commands](host-checks.json) and named logs |
| New Emscripten artifact audit guards | 11/11 | [audit guards](emscripten-audit.json) |
| Actual remux, pthread + JSPI | 12/12 | [result](../media-remux-jspi-01/result.json) |
| Actual remux, pthread + Asyncify | 12/12 | [result](../media-remux-asyncify-01/result.json) |
| PCM24 → FLAC, pthread + JSPI + Asyncify | 20/20 | [result](../media-transcode-pcm-01/result.json) |
| AC-3 → FLAC24, pthread + JSPI + Asyncify | 20/20 | [result](../media-transcode-ac3-01/result.json) |

The final media matrix is **64 checks: 48 candidate cases plus 16 pthread reference cases**. This includes ordinary media and deliberate failure/lifecycle scenarios; it is not 64 Player or playback tests. Preliminary baseline-only and JSPI diagnostic runs are retained separately and are not added to this final count.

[summary.json](summary.json) ties the final tests to verified sources, binaries, audits and captured outputs. `python3 -B experiments/jspi-asyncify/local/summarize.py` passed its correspondence checks. The original archive extraction also still passes its untouched verifier. The source delta passed a dry-run application against that extraction.

## What actually ran

Chrome 153.0.8010.53 on this Mac, using the local Emscripten 4.0.14 SDK, Clang 22.0.0git and Binaryen 123. This is a new local qualification, distinct from the package's Clang 17 / Binaryen 133 / Chromium 144 record. Tool hashes, browser facts and dependency versions are retained in [campaign.json](campaign.json), the build records, and [python-environment.txt](python-environment.txt).

The raw fixtures exercise the supplied custom continuation scheduler. The actual FFmpeg engines separately use Emscripten's normal JSPI or Asyncify glue, serialized by the single-owner bridge. These are different execution layers; no full libmpv continuation integration was attempted.

The media harness runs Workers from real localhost HTTP origins. Candidate cases require `crossOriginIsolated=false`, no exposed SharedArrayBuffer, and private ArrayBuffer memory. Asyncify removes both JSPI APIs before instantiation. The pthread reference runs in a separate isolated origin with a shared source mailbox. Each test uses a new Worker/module.

Frozen media:

- H.264 + AAC / MPEG-TS, remuxed without codecs enabled in the candidate libraries.
- H.264 + PCM24 / MKV, selected audio encoded as source-integer FLAC.
- HEVC 10-bit + AC-3 / MKV, selected audio decoded and encoded as FLAC24.

Media cases use Blob-backed input or actual HTTP 206 range reads, with start targets of 0 and 2 seconds. They compare probe metadata, codec selection, copied-video packet payload/timing, decoded video and decoded audio with the frozen served pthread engines. Remux compares every packet's payload/timing; transcode additionally compares every output packet's timing, including encoded audio. The final transcode video oracle preserves pixel format: `yuv420p` for the PCM24 fixture and `yuv420p10le` for the HEVC/AC-3 fixture.

PCM24 preserves native source PCM exactly. AC-3 uses an explicit tolerance of one 24-bit LSB against native source decoding (256 units in s32); the observed maximum is 192. Candidate PCM still matches pthread PCM exactly. This is not a claim of lossless preservation of higher-precision decoded AC-3 samples.

Fault/lifecycle cases use the actual C engine to verify cancellation after an observed pending source read, preservation of an injected reader error, replacement with a different-format source followed by reopening the original source, and terminal disposal after an output callback throws. The cancellation/error injections are host-source faults, not a complete adverse HTTP server suite. No C teardown is claimed after a poisoned operation; that module is discarded.

## Findings and fixes

1. **Emscripten audit gap fixed.** The original `--emscripten` path skipped runtime/export checks and reported its requested Asyncify setting as if observed. It now requires the backend, checks remux/transcode exports and the asynchronous read import, and derives control-export facts from the binary. Eleven added ABI guard cases pass, and each of the four actual final engines rejects an audit claiming the opposite backend. Static JSPI checks are explicitly not a substitute for glue/runtime execution.
2. **Build environment fixed.** The original builder set obsolete `EMMAKEN_CFLAGS` to an empty string. Emscripten rejects even that, so it is removed. The failed first build remains in the `remux-jspi-01` external prefix and its local log. Configure now uses an explicit Bash invocation. Each build uses its own cache/config and records source/tool hashes.
3. **Encoder-profile mismatch resolved without relaxing output checks.** The package's source default is FLAC level 5; the frozen served pthread engine's manifest specifies level 0. The first actual JSPI transcode run produced identical decoded video/PCM but failed packet timing: 4,608-sample FLAC packets versus 1,152-sample reference packets. That run remains [8/12](../media-transcode-jspi-preflight-01/result.json). The matching [pthread build manifest](pthread-transcode-build-manifest.json) and [diagnosis](transcode-profile-mismatch.json) are preserved. Both candidate transcode profiles were relinked at level 0 using the already verified private libraries. The originals were retained, and the exact packet-timing assertion now passes.
4. **Browser-driver startup issue recorded.** The first Python Playwright launch stalled before useful execution. It was terminated and logged. Subsequent runs explicitly use the existing Node executable through `PLAYWRIGHT_NODEJS_PATH`; all 121 infrastructure outcomes passed with that configuration.

## Artifacts and continuation

External build root: `/Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927/`.

| Profile | Final engine directory |
|---|---|
| JSPI remux | `remux-jspi-02/engine/` |
| Asyncify remux | `remux-asyncify-02/engine/` |
| JSPI selected-audio transcode | `transcode-jspi-03/engine/` |
| Asyncify selected-audio transcode | `transcode-asyncify-03/engine/` |

All four `-02` profiles were independently prepared and full-built. The two transcode `-03` prefixes are separately recorded final links reusing the corresponding verified `-02` static libraries. Their source/library hashes, original build identity, level override, exact link commands, audits, glue and Wasm hashes are preserved. `build_completed_only` remains the truthful build-record status; component execution evidence is in the media records linked above.

Frozen reference engines and fixtures are in `build/jspi-asyncify/frozen/` under this worktree; [frozen-inputs.json](frozen-inputs.json) records their original paths and hashes. The reference is the frozen served pthread binary, not a freshly rebuilt pthread engine or a matched performance campaign.

Source changes and reproduction commands: [local development README](../../../experiments/jspi-asyncify/local/README.md). [from-reviewed-package.patch](from-reviewed-package.patch) applies to the reviewed package root, not the live Demuxe root. [changed-package-sources.json](changed-package-sources.json) records the ten changed/added source and documentation files.

Next integration boundary: bind these component engines to an experimental player worker/source adapter after coordinating with the Player API changes. Preserve cancellation during pending operations, output backpressure, generation ownership and terminal error classification. Keep separate asset/cache/runtime identities and the existing production pthread route.

Still pending: Player/MSE playback and repeated live-seek behavior, alternate-track and broader codec coverage, priming/padding and malformed-media campaigns, authenticated/cross-origin/adverse HTTP, Firefox/Safari/device coverage, long-media resource limits and performance. Full Emscripten/mpv continuation ownership, real subtitle-service pixels and non-shared mpv audio remain independent implementation work. The built Opus encoder and other audio decoders are not qualified by the PCM24/AC-3 fixture results.
