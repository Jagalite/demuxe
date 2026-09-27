# Local JSPI / Asyncify development fork

Local integration work is documented in [local/README.md](local/README.md) and
the [actual mpv component follow-up](mpv/README.md). The
original package description below and its manifest refer to the delivered
snapshot. Local edits and rebuilt artifacts intentionally no longer match that
manifest; use the preserved extraction recorded in `LOCAL-ORIGIN.json` to verify
the original evidence. Current local results live in `../../results/jspi-asyncify/`.

# Demuxe — reviewed JSPI / Asyncify test package
**September 27, 2026 · Research/local-testing package. Not a production media engine.**

This replaces `Demuxe_JSPI_Asyncify_Investigation.zip` for the continuation experiment.
Production Demuxe files, routing and served engines have not been changed.

## Read first
- [Review and evidence limits](docs/REVIEW.md)
- [Exact source changes](docs/SOURCE_CHANGE_MAP.md)
- [Build and test commands](docs/BUILD_AND_TEST.md)
- [Local-agent handoff](docs/LOCAL_AGENT_HANDOFF.md)

## Verify the untouched extraction
```sh
python3 -B verify.py
```
This checks file hashes, pinned mpv source identities, exact test cases, and source/build/run correspondence.
It does not compile or run a browser. Make a second extraction before rebuilding; local outputs invalidate the immutable snapshot.

## What passed here
- 94/94 existing expected browser outcomes: 90 positive cases plus four correctly rejected negatives.
- 27/27 added continuation outcomes: 26 checks including deliberate-fault handling, plus an omitted-import negative.
- 58/58 host/build/result/binary-audit checks.
- JSPI and actual Binaryen-transformed Asyncify; Asyncify runs forbid JSPI.
- Chromium 144, Clang 17, Binaryen 133; `about:blank`/Blob Workers with private memory.

**Not established:** full Emscripten/libmpv/FFmpeg execution, real subtitle pixels, audio output, HTTP deployment,
other browsers, long-media endurance, CPU savings, or production readiness. Full mpv Asyncify continuation ownership
within Emscripten remains unimplemented/unqualified. The raw driver must not be blindly inserted into the previous loader.

## Package boundaries
`runtime/` is the raw cooperative experiment. `ffmpeg/` is a separate serialized host contract and prepared build profile.
The full mpv media loader is not included as a pretend dual-ready implementation.
Files named `*-small*` and `*-omitted-import*` in `artifacts/` are deliberate test fixtures, never deployable service assets.
The source delta in `patches/` applies to the previous investigation package, not to the live Demuxe repository.

No SDK tools, dependency archives, or font files are bundled.
