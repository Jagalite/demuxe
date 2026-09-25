# Selective native video plus mpv audio: integrated qualification

Base: local `main` e61d3b48 (descends from the current `origin/main` 904853dd). The checkout contains unrelated, preexisting work; this report describes only the selective-route changes. This is a narrow Chrome/macOS qualification, not a tagged release or broad codec claim.

## Plan and ownership

`native-video-mpv-audio` is an explicit automatic execution plan ahead of Hybrid. The maintained remuxer copies the selected compressed video packets only into MSE; `<video>` owns VideoToolbox decode, native compositor presentation and the master media clock. A second local reader feeds mpv with `vid=no`, `sid=no` and the selected audio stream. The private selective engine reuses the browser AO PCM ring and a dedicated timestamp-aware AudioWorklet. mpv has zero selected video tracks. The route has no WebCodecs video worker or visible Hybrid canvas. Two readers are required for the current local Matroska implementation; no video transcode occurs.

Admission is limited to inspected, finite, local Matroska with aligned selected track bounds, H.264 up to 1080p or the exact qualified HEVC Main10 profile up to 1080p, 48 kHz stereo AC-3 or DTS, default gain, stereo output, no video/audio transforms, no requested embedded or external subtitles, isolation, Web Audio and video-only MSE support. Actual video output and PCM consumption are verified after startup. Explicit modes stay pinned. E-AC-3, multichannel, other containers/codecs, remote sources, HDR tone mapping and triple-service subtitles remain unqualified.

The selected source stream index, rather than mpv's track ID, governs audio selection and diagnostic labels. A multi-audio file exposed a mismatch here during integration; it is fixed and the AAC→AC-3→AAC→AC-3 and AC-3→DTS→AC-3 reopen transitions now select and report the intended stream.

## Clock and lifecycle

Browser video media time is authoritative. PCM output carries source media PTS, effective rate, generation and epoch. The worklet reports its audible frame boundary; `estimatedAudioPresentationTime` compares that timestamp to browser video time. A 50 ms sustained error starts at most ±0.5% temporary audio speed trim, released inside 30 ms. Persistent missing timeline or >250 ms error triggers diagnosed fallback. Normal rate changes are scheduled at the audible PCM boundary without an audio seek; public `playbackRate` changes when the visible rate takes effect during playback. When paused it represents the rate requested for the next playback, with requested/pending/effective values separately exposed in diagnostics. A rate request can take approximately 0.35–0.42 seconds to become effective while playback continues.

Seeks stop publication, advance generation, clear stale queued PCM, seek browser and mpv, wait for matching epochs, then establish a new sync baseline. The integrated AC-3 seek phases reported equal native/ack epochs and zero stale-epoch output callbacks. EOF drain callbacks are separate from active underruns. Focused integrated runs passed 1×, 1.5×→1×, pause/resume, forward/backward/paused seeks, nearby/overlapping seeks, seek near a rate change, EOF→replay, source replacement after EOF and destroy during seek/rate. Long pause and final-source rerun are recorded in `smoke-ac3.json`. The 125-second continuous AC-3 run in `drift.json` had zero active underruns, p95 absolute estimated skew 35.9 ms, maximum 48.1 ms and four bounded soft corrections; the offset did not keep growing after correction. The DTS lifecycle run had zero active underruns and zero routine rate-change seeks. The HEVC Main10 run had zero active underruns. Native Chrome Media properties reported `VideoToolboxVideoDecoder` and platform decoder `true` for integrated H.264 and HEVC runs.

Failure injection covered missing assets, video preparation, audio startup, runtime audio failure and loss of the sync timeline. Each reached Hybrid with playback progress and a plan-specific diagnostic reason. ASS and PGS plus unsupported audio were intentionally rejected from selective admission and selected Hybrid. E-AC-3 was rejected with the codec qualification reason and selected Hybrid. Their three-service composition is not admitted.

## Matched production CPU

Chrome 153.0.8010.53 headed on macOS, 960×540 output. Each row averages two accepted fresh Chrome 20-second windows after four seconds warmup; order was Hybrid, selective, selective, Hybrid. CPU is percentage of one core across the Chrome process family, so differences below are absolute core percentage points. The source/codec is matched within each pair. Small paired samples are descriptive, not a variance bound or a release catalogue.

| Fixture / arm | Whole | Browser | Renderer | GPU | Audio service | Startup ms | Chrome RSS MiB |
|---|---:|---:|---:|---:|---:|---:|---:|
| H.264 AC-3 Hybrid | 83.0 | 39.2 | 20.2 | 22.8 | 0.68 | 1032 | 993 |
| H.264 AC-3 selective | 66.6 | 37.1 | 16.8 | 12.1 | 0.52 | 1093 | 985 |
| H.264 DTS Hybrid | 82.4 | 38.2 | 20.4 | 23.2 | 0.64 | 1128 | 1000 |
| H.264 DTS selective | 68.0 | 36.5 | 18.5 | 12.3 | 0.67 | 1167 | 1002 |
| HEVC Main10 AC-3 Hybrid | 71.9 | 37.3 | 16.7 | 17.2 | 0.53 | 918 | 977 |
| HEVC Main10 AC-3 selective | 60.9 | 33.5 | 16.2 | 10.4 | 0.71 | 976 | 990 |

Paired savings were 15.1/17.6 points for H.264 AC-3 (mean 16.4), 11.7/17.1 for H.264 DTS (mean 14.4), and 12.6/9.4 for HEVC Main10 AC-3 (mean 11.0). The original H.264 target of at least 10 points survived integration. Most measured reduction was in GPU and renderer CPU. Startup was about 40–61 ms slower on average for selective, but two launches per arm cannot establish a stable startup penalty. Chrome RSS differences varied in sign and are likewise inconclusive. The two selective source readers each fetched approximately one file's worth of local bytes in the measured window (H.264 AC-3: 14.2 and 14.5 MB); duplicate demux/read cost is real, but did not erase the CPU win. Raw rows: `cpu-1790306095984/result.json` and `cpu-1790306286731/result.json`.

The CPU campaign preceded the later multi-track identity fix, timeout cleanup, sync watchdog and diagnostic labeling. Those changes do not alter the single-track video presentation or PCM copy path used in the campaign; the final source was not remeasured for CPU.

## Build and remaining gates

`build/selective-audio/manifest.json`, `build/link-maps/selective.map`, `build/lgpl-closure.json` and `build/beta-build.json` contain a matching local selective-engine build and LGPL closure. The additional selective Wasm file is about 22 MiB before package compression. TypeScript, focused plan-admission contracts and `npm test` (including Native, Hybrid, Software, source replacement and worker cleanup) passed. The old Hybrid and other engine assets were not replaced. Existing README CPU cells were not refreshed because they belong to different fixtures/campaigns; the matched table above is a separate production-route campaign.

The local beta package command stops at the repository-wide license scan: preexisting captured research harness files under `results/unsupported-audio-cpu/` have SPDX/map mismatches. Generated headers were stamped successfully, leaving only those unrelated research mismatches. The focused existing native mpv-subtitle service check passed. All 14 Shaka lifecycle cases passed and wrote `results/shaka/lifecycle-2026-09-25T03-45-06.092Z/result.json`, but the command hung after writing its result and was interrupted during final teardown. The existing automatic-selection browser suite reported Native remux, filter, remote transport and other failures outside this selective fixture set; its earlier available run contained only three cases and cannot establish whether all of those failures predate this change. A complete clean-source release candidate catalogue, exact archive consumer run, broader browser qualification, and subtitle triple-service composition remain open. These gates prevent a release-ready disposition.

**Disposition: PRODUCTION ROUTE WORKS — BREADTH QUALIFICATION REMAINS.**
