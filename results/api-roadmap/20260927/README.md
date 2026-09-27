<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# API roadmap implementation and validation

2026-09-27. All five recommended implementation phases in the supplied roadmap now have public APIs, documentation, and focused checks. This means implementation within the explicit contracts below, not universal codec/browser support or completion of the document's separately deferred product ideas.

Input: `Demuxe-API-Review-and-Roadmap.md`, SHA-256 `5dd8c7150b34d974d68d0b23b3348c38039f8940f7602b7f773517d96b27a663`. Initial review base: `e7a8d02d126e381b50af9836b202f3d5186082ea`. The shared checkout independently advanced to watchdog commit `4576bba9d65cc35cc4a1462acb87e2465ae85924` during implementation. Existing changes were preserved. This task issued no commit or push.

## Implemented

- Contract stabilization: runtime preview facade; typed routing/selection events; option/default classifications and limit clarification; bounded source/session statistics; structured, redacted playback explanations with admission codes and nullable effective fidelity.
- File workflows: transactional VOD initial position; richer observed metadata, bounded chapters/tags and chapter navigation; subtitle/audio timing and plain-text styling; opaque file/URL-subtitle/font attachment handles and removal.
- Streaming: Shaka quality enumeration, automatic ceilings/manual variants, selected versus observed quality, live navigation/window/latency observations, policy-preserving audio selection, and plain WebVTT attachment lifecycle.
- Library integration: Blob normalization; independent, budgeted local/remote inspection; immutable callback sources with serialized short reads, ownership, cancellation, identity checks, and bounded playback staging.
- Presentation/power tools: fullscreen, video/document PiP, explicit Media Session ownership, output-device retention, loops/ranges, latest-seek supersession, snapshots, and forward/backward mpv frame stepping.

Current contracts are in [API-EXTENSIONS.md](../../../docs/API-EXTENSIONS.md), defaults in [API-OPTIONS.md](../../../docs/API-OPTIONS.md), and compatibility changes in [API-MIGRATION.md](../../../docs/API-MIGRATION.md). The [implementation plan](../../../docs/API-ROADMAP-IMPLEMENTATION-PLAN.md) maps each roadmap slice to its result.

## Validation

Environment: Darwin 25.5.0 arm64; Node v23.5.0; Chrome 153.0.8010.53; Playwright Firefox 146.0.1; Shaka 5.2.11. Tests use the maintained `fixtures/example.mp4`, generated chapter/tag MKV, and synthetic adaptive HLS/EVENT fixtures. These are API/lifecycle tests, not performance campaigns.

| Check | Result | Evidence |
|---|---|---|
| Normal build, generated declarations/runtime, dependency and license boundary checks | Passed | [build.log](build.log) |
| Node contracts: roadmap, consumer types, state/tracks, Shaka/network/admission, inspection, preview/cache/range | 115/115 | [node-contracts.log](node-contracts.log) |
| Chrome roadmap | 17/17 | [result](../chrome-1790523971423/result.json), [log](chrome-roadmap.log) |
| Firefox roadmap | 17/17 contracts; includes two explicit PiP-unavailable checks | [result](../firefox-1790523971423/result.json), [log](firefox-roadmap.log) |
| Chrome Shaka quality/attachments and live navigation | 2/2 | [result](../../shaka/lifecycle-2026-09-27T15-37-40.621Z/result.json) |
| Firefox Shaka quality/attachments and live navigation | 2/2 | [result](../../shaka/lifecycle-2026-09-27T15-44-04.440Z/result.json) |
| Existing Chrome public API lifecycle suite | 21/21 | [result](../../public-api/chrome-2026-09-27T15-44-04.439Z/result.json), [log](public-api.log) |
| Final targeted signed-URL redaction including playback explanation | 1/1 | [result](../../public-api/chrome-2026-09-27T15-47-11.507Z/result.json), [log](redaction.log) |
| Scoped whitespace check | Passed | `git diff --check -- src docs tests package.json .github/workflows/licensing.yml` |

The full public API run preceded the final output-sink admission guard; the final roadmap runs exercise that guard and rollback. The signed-URL check was rerun against the final implementation. [hashes.json](hashes.json) captures the final source/generated API, relevant transport code, tests, and maintained fixture. [runs.json](runs.json) indexes the result files. Adaptive result files also preserve fixture-generation commands and their own source hashes.

Reproduction (requires built engine assets, maintained fixtures, ffmpeg, and installed Playwright browsers):

```sh
npm run test:roadmap
BROWSER=firefox npm run test:roadmap
node tests/public-api.mjs
```

The broader Node run is recorded in the log and used these files:

```sh
node --test tests/roadmap-contracts.mjs tests/preview-facade.mjs tests/public-api-state.mjs tests/track-policy.mjs tests/shaka-backend.mjs tests/shaka-network.mjs tests/plan-admission.mjs tests/fast-source-inspector.mjs tests/preview.mjs tests/preview-pregeneration.mjs tests/preview-range.mjs
```

Focused roadmap/consumer contracts are included in the license-boundary CI workflow. Browser checks remain explicit local qualification; this task did not run remote CI or publish a package.

## Bugs found and corrected during validation

- Native/URL attachment removal initially applied the old ordinal before restoring the stable public ID. Replacement now stages automatic selection and then restores the explicit identity.
- Shaka attachment identities now survive ordinal changes; runtime manual quality pins constrain subsequent audio choices, while original source representation policy retains its existing semantics.
- mpv chapter timestamps can include negative preroll. Normalization clamps that first start to zero, retains original ordinals, and reads numeric times rather than formatted labels.
- The default audio sink maps to the empty browser sink ID. Routes lacking the required AudioContext API reject during admission and preserve the accepted source.
- Document PiP route replacement originally put the worker-owner iframe in the temporary document. Runtime ownership now remains in the original document; the regression covers subtitles, replacement, PiP close, subsequent seeking, and final destruction.

Earlier failed runs remain in adjacent dated result directories. They are development evidence, not replaced with passing results.

## Qualification limits

Custom callback playback stages a complete source of at most **32 MiB**; it is not lazy large-file playback or a worker callback bridge. Larger bounded inspection remains possible. Providers explicitly own their callback transport policy; RemoteSource retains Demuxe's network policy.

Metadata reflects backend observations. Native may not report chapters/tags; standalone inspection reports its container/track/duration coverage without claiming exhaustive chapter/tag extraction. Reported color metadata is not HDR output evidence. Presented-quality identity, unobserved frame counters, and throughput remain null.

Timing/style controls currently require mpv playback. Styling covers plain text and retains authored ASS behavior. Frame stepping requires mpv video; screenshots have explicit subtitle/readback restrictions. The test validates timing settings across mpv routes, not every subtitle codec's rendered offset or every audio device's physical latency.

Chrome exercised real fullscreen, video PiP, document PiP with subtitle/route retention, and default output switching. Firefox exercised fullscreen and Native output selection, explicit rejection/rollback for an AudioContext route without sink selection, and explicit unavailability of both programmatic PiP APIs. No non-default physical output device was selected. No claim is made for Safari, every PiP/codec combination, or permission chooser behavior.

Loops use observed clock boundaries and may overshoot or restart with a gap. Manual Shaka variants cannot be assumed equivalent across replacement sessions. The live test uses a real dynamic EVENT timeline; the existing live-window race tests remain separate historical coverage.

The earlier [preview-only report](../../api-preview-facade/20260927/README.md) retains the component autoplay-test mismatch (48/50) and Firefox software-preview harness variability. Those broad suites were not claimed newly green here. No new codec, lossless, HDR, CPU, memory, clean-engine-build, or release qualification is implied.

DRM, offline downloads, casting, advertising, a processing/editor SDK, transcript/secondary subtitles, a second playlist owner, and an optional framework package remain the separate/deferred product choices described in the supplied document. Framework usage is documented over the existing immutable subscription lifecycle.
