# Maintained non-isolated remux integration

Implemented in the main working checkout, preserving pre-existing uncommitted work. No commit, push or release publication was performed.

The maintained Player inspects and selects a no-pthread JSPI remux runtime on non-isolated origins for finite single-video AVC / single-audio AAC MPEG-TS. The worker transport reuses authorized RangeReader/LocalFileReader ownership, bounded MessageChannel reads, generation cancellation, MSE negotiation and source identity checks. Isolated pages retain the pthread engine. Build, preparation, packaging, asset copying and exact-archive release verification include the new runtime.

| Verification | Result | Evidence |
| --- | --- | --- |
| Maintained JSPI Wasm build | passed | Runtime hashes in [manifest](manifest.json) |
| TypeScript and focused contracts | 40 passed | [contracts](contracts.log) |
| Chrome 152.0.7977.83, exact package, no COOP/COEP | 10/10 passed | [result](../2026-09-21T19-35-15.275Z/result.json) |
| Chrome, same package, isolated pthread regression | 7/7 passed | [result](../2026-09-21T19-34-47.020Z/result.json) |
| Firefox 146.0.1, same package | JSPI absent; missing-feature rejection passed | [result](../2026-09-21T19-34-47.221Z/result.json) |
| Asset copy/hash/required-runtime contracts | 10 passed | [copy checks](copy-assets.log) |
| Temporary snapshot package license/dependency closure | passed | [package log](package.log) |
| Full checkout npm build | TypeScript passed; license stage failed on unrelated subtitle-service files | [build log](build.log) |

The public Player output decodes to exactly matching pixels and PCM against the source. JSPI diagnostics report an unshared 64 MiB heap. Tests cover default automatic selection, explicit Native local playback, independent players, remote playback, seek/replacement, a 24-second 9.5 MiB TS larger than the source cache, authentication refresh, changed ETag rejection, unsupported MP4, missing JSPI, suspended-read cancellation and zero workers after destruction.

The tested archive is `build/jspi-package-candidate/demuxe-0.3.0-beta.3.tgz`, SHA256 `da4da6f5a1ab48e4a3ef2ea6c55287879a9d32a99b05917ca44089d5ac4d8ca2`. It was packaged from a temporary validation snapshot containing the current maintained runtime files and actual engines, excluding unrelated experiment/results trees. Its synthetic snapshot commit is not a clean source release revision. Exact-package functionality is established; tagged corresponding-source release verification is not claimed.

The main checkout license failures are `experiments/mpv-subtitle-service/page.mjs`, `worker.mjs`, and SPDX/map mismatches in two existing `results/mpv-subtitle-service/.../source/` runs. These files were left unchanged. No speed advantage, total browser-memory bound, Safari/mobile support, long-session endurance, physical output qualification or broader codec/container admission is claimed.
