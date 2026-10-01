<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Non-isolated playback production completion

The user authorized committing the existing foundation and completing and testing
this feature for production on 2026-09-30. The implementation and agreed functional
package gates are complete on `codex/nonisolated-software-20260929`; the internal
qualification branch is `codex/nonisolated-production-20260930`. The foundation
is commit `24a3a9bf`.

**Final status:** The original 99 exact-package browser checks passed, followed by
21 package checks for the review fixes. Source/build, license and isolated-engine
correspondence were verified. See [Final package qualification](#final-package-qualification)
and [Review follow-up](#review-follow-up-timeline-and-provider-asset-ownership).
The earlier checkpoint notes below retain historical pending and rejected results;
the final section supersedes their status. No push, merge into main or deployment
was performed.

## Completion contract

Pages without COOP/COEP must be able to use the existing finite playback plans
with the selected JSPI or Asyncify runtime. Software must cover the existing
Software codec matrix, and Hybrid must retain browser video decoding with mpv
audio. Supported settings, tracks, subtitles, filters, source authorization,
seeks, EOF/replay, interruption, replacement and destruction must behave through
the public Player. Source and feature admission must follow actual shipped
assets and tested contracts. Capability reporting must match that admission.

Native/remux routes must retain their existing behavior. Isolated pthread
playback must pass regression checks. Unsupported source/browser constraints
must report a specific rejection; capability signals cannot establish playback.
No production deployment or merge follows automatically from this worktree.

## Implementation and qualification sequence

1. Commit the tested cooperative Software foundation and evidence. Done.
2. Connect public construction, finite admission, preparation and capabilities;
   qualify all six original Software fixtures through public Player on Chrome
   JSPI, Chrome forced Asyncify and Firefox Asyncify. In progress.
   Chromium JSPI and forced Asyncify passed all 12 public cases after repairing
   canvas presentation ownership. Firefox passed five public Software codec cases and four Hybrid cases; forced HEVC Hybrid correctly rejected an unsupported browser configuration. The original six-fixture public Firefox suite also passed against the updated assets. Five additional codecs passed public Software and Hybrid on both Chromium runtimes. Four public subtitle/filter/snapshot/continuous PCM cases now pass in Chromium; Firefox also passed two public feature/PCM and two public custom-font cases.
3. Expand the private playback codec/filter build to the upstream LGPL Software
   profile and port remaining public settings, subtitle/font and snapshot methods.
   Qualify the additional existing format and feature rows with independent
   decoded picture/audio/subtitle references. In progress: dependencies built;
   pre-instrumentation optimization repairs the full VP9 Asyncify local limit.
4. Implement private Hybrid video ownership, complete configuration/seek/packet
   lifetime and fallback contracts. Qualify Hybrid rows and preserved native video
   plus remux/adapted audio rows. In progress: bounded retained decoder and
   cooperative mailbox adapters have resource and cancellation unit coverage;
   native integration, public codec coverage, 24 embedded-subtitle cases and 20 asset/cancellation fault cases passed. Automatic fallback and Native-to-filtered-Software promotion subsequently passed; see the regression evidence below.
5. Remove prototype-only file/duration restrictions when bounded readers, seek
   policy, resource handling and representative long/large sources pass. Qualify
   HD continuous playback and lifecycle/error/cancellation stress. The 132-second long-GOP source and 84 MiB source passed eight public mode/runtime cases; the large source read under 1 MiB with a 64 MiB heap. Eight public 720p/1080p 30 fps cases passed at full canvas resolution across both modes and runtimes; public 4K HEVC 10-bit at 5 fps passed both modes and runtimes. This does not qualify 4K at higher frame rates. Lifecycle fault, cancellation, malformed-manifest and sustained-pressure cases subsequently passed; see the evidence below.
6. Include the private playback profile in the clean release recipe, source
   companion, runtime closure and asset manifests. Qualify both runtime consumers
   against the exact assembled archive and regression tests. Recipe and runtime closure implemented; exact archive qualification pending.
7. Review and fix remaining findings; update README/support documentation from
   accepted public evidence and commit the production implementation. Pending.

Full CPU benchmarks remain excluded as agreed in the preceding qualification
request. Continuous playback cadence, audio fidelity, A/V progress and resources
remain correctness gates. No claim of physical HDR output, browser hardware
acceleration or performance parity follows from decoder execution alone.

## Evidence ownership

New runs belong to `research/items/nonisolated-full-software-playback/evidence/`
with fresh UTC IDs. Preserve failed runs and original manifests. Large raw media
captures remain locally available outside Git with hashes in historical manifests
and `RAW-ARTIFACTS.json`; source snapshots, results and commands are committed.

## Active audio parity investigation

The current full assets passed 24 public cases for AAC, E-AC-3, DTS, TrueHD,
ALAC and PCM24 with H.264 video across Software/Hybrid and JSPI/Asyncify.
Output-device layout selection and stereo fallback are being aligned with the
isolated backend. Twelve direct and twelve public cases passed independent consumed-PCM checks
for 44.1-to-48 kHz resampling and 5.1/7.1 input downmixed to this device's
two-channel output. This does not establish physical surround output. Multi-track qualification exposed an EOF/track-switch seek
problem: a request for zero briefly reported zero, then settled at the next
keyframe. Native traces showed that a track-switch refresh flag survived an
ordinary seek with cache disabled, dropping the first packet/keyframe. Patch
0019 clears that stale flag when the cache range is reset. The original failing
case and all four direct mode/runtime combinations now pass with caching disabled;
each audio track produced 288,000 frames and matched 567,808 compared samples
exactly. All four public combinations also pass. Multi-track admission requires
the installed manifest's `track-switch-seek` feature, so older assets retain
the one-track limit. Audio-only/mono, fonts and public plain-subtitle styling
have also passed the current public checks.

New evidence includes `20260930T1530-audio-public-01`,
`20260930T1548-long-large-public-01`, `20260930T153255Z-public-features-02`,
`20260930T1600-tracks-backend-01`, and `20260930T1552-tracks-public-01`. Some directory IDs were estimated during
the run; each result's `startedAt` is the authoritative execution timestamp.

## Historical checkpoint before final packaging

- HDR-to-SDR now passes PQ and HLG cadence, consumed PCM and independent RGB
  reference checks with both LUT implementations. PQ presented 179/180 and
  180/180 pictures, and HLG 180/180 in both runtimes, with exact compared PCM
  and maximum observed A/V error below 7 ms. All four Chromium public Player
  cases also passed seeks, filtering, controls, replacement and cleanup.
  Both Firefox public HDR cases also passed. Public admission requires the full profile, both LUT feature markers and the
  zscale/format/tonemap filter closure. Older assets remain rejected. Firefox
  qualification is retained separately; the clean assembled archive remains pending.
- The cooperative full playback heap ceiling is now 512 MiB.
  The previous 128 MiB build exhausted memory on 4K. New 4K seek pictures passed
  both Software runtimes at a 346,554,368-byte heap. Four public 5 fps continuous
  cases passed; source dimensions remain tied to the installed heap profile.
- Decode-quality and adaptive policy forwarding now uses the shared policy
  rules, one cooperative decode thread, and native acknowledgement before
  reporting a policy change. Unit checks cover source replacement during that
  acknowledgement. Ten public policy cases passed exact/balanced/performance
  and none/metadata/auto preload across both runtimes. Both runtimes also passed a real sustained-pressure transition and recovery in `20260930T180644Z-adaptive-pressure-04`. The harness added a costly backend filter workload without fabricating counters, verified native `noref` options under pressure, removed the workload, verified exact recovery, then checked seek and cleanup. This is policy/lifecycle qualification, not a CPU benchmark.
- Embedded subtitles passed all 24 public combinations (SRT, mov_text, ASS,
  PGS, VobSub and multiple SRT tracks). All 20 public fault cases passed,
  including pending-read cancellation in 2–5 ms and zero surviving workers.
- Fourteen additional public format cases passed: MJPEG/PCM, FFV1/FLAC,
  MSMPEG4/WMA, H.264/WavPack and H.264/float32 PCM. Full Software admission
  now follows the linked decoder inventory. Sixteen direct consumed-PCM cases passed for 8 kHz mono, 32 kHz quad,
  96 kHz stereo and 192 kHz 7.1 input. Full admission now checks valid input
  metadata and linked decoders; all 16 public cases also passed. Explicit
  demuxer hints now reach FFmpeg inspection and mpv, with a raw SBC fixture
  and matching inspector assets. A leftover positive-duration gate rejected finite raw SBC with unknown duration; full-profile admission now permits zero (unknown) duration while retaining source-size and decoder checks. All four public extension/hint and JSPI/Asyncify cases passed EOF and exact PCM comparison in `20260930T180403Z-demuxer-public-02` (288,000 frames and 567,808 compared samples per case).
- The fresh isolated pthread EOF/track-switch regression passed RGB, YUV and
  Hybrid with caching on and off (six cases). The former failing second audio
  track now starts at position zero with the correct first picture. Exact
  archive/source companion qualification remains pending; no production
  readiness or merge claim follows yet.

Recent accepted evidence: `20260930T163243Z-track-seek-fixed-01`,
`20260930T163257Z-dual-track-pcm-fixed-01`,
`20260930T163748Z-dual-track-public-01`,
`20260930T163337Z-4k-memory-fixed-01`,
`20260930T164133Z-4k-public-continuous-02`, and
`20260930T1624-font-public-03`. The earlier 4K continuous run retained its failed
fixed 250 ms threshold; the fresh 5 fps run records individual presentation times
and uses a cadence limit scaled to the source frame interval.

Additional accepted evidence: `20260930T164341Z-embedded-subtitles-public-01`,
`20260930T164704Z-firefox-original-software-01`,
`20260930T165127Z-firefox-public-features-02`,
`20260930T165202Z-hd-output-public-continuous-01`,
`20260930T165422Z-public-faults-02`, `20260930T165517Z-firefox-fonts-01`,
and `20260930T170702Z-format-parity-public-01`. The failed first fault run and
HDR runs remain in the evidence history.

Policy evidence: `20260930T170623Z-public-policies-02` (10 passed);
input audio evidence: `20260930T170648Z-extended-audio-backends-01`
(16 passed). The first automatic-selection harness incorrectly still supplied
a forced mode; its six rejected assertions are retained in
`20260930T172343Z-format-automatic-01`, and the corrected default-selection run passed after the filter-selection repair described below.

## Current regression repairs

The automatic six-case format run reached Software and passed the initial
pictures, playback controls and replacement, then failed on an automatic filter
change. The selector cleared inspection and skipped probing once filters ruled
out Native. Cooperative playback now retains the inspection requirement for
those filtered selections; all six fresh browser cases passed. Accepted evidence:
`20260930T173922Z-format-automatic-03`; failed evidence:
`20260930T173247Z-format-automatic-02`.

Broader plan tests found that plain-VTT admission had inadvertently widened
three unrelated Native subtitle branches. The allowance is now confined to
private full playback; all 46 routing, admission and runtime-capability checks passed after the fix. The range
reader suite initially lacked its required server; after starting the fixture
server, all 11 range reader checks passed.

Cross-origin asset loading passed all four public mode/runtime combinations in
`20260930T173539Z-cross-origin-assets-01`, with a separate CORS-enabled asset
origin and source-bound worker/glue/Wasm identities. The first adaptive workload
remained synchronized with zero drops, so its pressure-transition deadline is
retained as an inconclusive test setup in `20260930T174143Z-adaptive-pressure-02`.
The later real-filter workload proved pressure and recovery in
`20260930T180644Z-adaptive-pressure-04`. Malformed private playback manifests
retain `ASSET_LOAD_FAILED` for private routes while allowing usable Native routes
to run; the browser checks for both sides are recorded below.

The broader routing/lifecycle rerun passed all 100 tests with its range server active (`20260930T175833Z-routing-lifecycle-regressions-02`). SPDX and license-boundary checks also passed at this checkpoint. Two adaptive workload runs produced no actual decoder pressure and therefore did not prove a policy transition; their failed transition deadlines remain recorded.

Malformed private-playback JSON/schema manifests now fail as `ASSET_LOAD_FAILED` in all eight forced Software/Hybrid runtime cases (`20260930T174851Z-manifest-faults-01`), with zero surviving workers or surfaces. Four default Native cases still play with those same malformed manifests (`20260930T174819Z-manifest-native-01`); served fault-body hashes prove the optional manifests were actually consumed.

Automatic Native playback now advertises the available full Software filter switch. Both runtime cases pass Native → filtered Software → Native with worker cleanup in `20260930T181309Z-native-filter-capability-02`. The first harness asserted immediate promotion, before the existing 200 ms scheduled promotion; that rejected assertion remains in `20260930T181136Z-native-filter-capability-01`. The production promotion policy was not changed.

The new isolated pthread regression reproduced the EOF/track-switch failure against the pre-patch main assets (`20260930T181838Z-isolated-baseline-01`): the first track passed first-picture/reference, audio, timeline and EOF checks, but selecting the second track and seeking to zero failed to present the requested position. The rebuilt patched engines subsequently passed all six regression cases, as recorded below.

## Main integration and Firefox follow-up

The feature is being integrated with main `954729d7` in the owned internal-SSD
worktree `codex/nonisolated-production-20260930`; the original feature worktree
will be advanced after qualification. Provider recipes retain finite plan
ownership and separate cooperative runtime identities. Existing modular
pthread preparation remains available when only its inspector uses Asyncify.
No optional provider metadata self-qualifies the new engines.

The fresh Firefox 146.0.1 checkpoint passed five Software codec cases and four
Hybrid cases. Forced Hybrid HEVC retained an unsupported WebCodecs result;
the same source passed Software. A separate public check passed the specific
Hybrid configuration error, changing to Software, playback and cleanup. The
original mixed-result run remains retained. Public rejection now reports the
selected cooperative plan's reason rather than an unrelated pthread plan.

The integrated source passes TypeScript, 89 focused routing/provider/admission/
preparation tests, seven release guards, and license/core-boundary checks.
The clean native build started with verified locked archives and Emscripten
4.0.14 in a fresh internal-SSD build directory. The rebuilt isolated regression
passed; exact binary/source archive checks remain pending. This is not release
readiness.

New integration evidence:

- `20260930T184505Z-firefox-public-checkpoint-05`
- `20260930T185224Z-firefox-hybrid-rejection-01`
- `20260930T184721Z-hdr-inverse-continuous-01`
- `20260930T184958Z-hdr-inverse-continuous-02`
- `20260930T185104Z-hdr-inverse-rgb-01`
- `20260930T185330Z-hdr-public-01`
- `20260930T185446Z-firefox-hdr-public-01`

## Fresh isolated regression

The six-case run uses lossless readback of the displayed canvas and independent
host RGB references. RGB MAE was 0.911, YUV 2.737 and Hybrid 2.676 for the first
picture of both audio tracks; all paused positions were zero. Both tracks reached
EOF and all cases closed their audio context and main-owned workers.

The first expanded run is retained: JPEG snapshot compression exceeded the raw
RGB threshold in YUV, and the pthread Hybrid worker did not implement the queried
software-only snapshot command. The corrected regression measures displayed
pictures without changing its error threshold. This qualifies EOF/seek/presentation,
not the existing isolated Hybrid snapshot API. Cooperative public snapshot checks
remain separate and passed earlier.

- `20260930T190442Z-isolated-patched-01`
- `20260930T190717Z-isolated-patched-02`


## Final package qualification

The immutable runtime archive is bound to source commit
`13643784d3863fd0d8f57cf85710397378303ef8` and local tag
`qualification/nonisolated-20260930-03`. The subsequent licensing-rule reorder
changes no runtime files or license assignments. The archive and corresponding
source are retained in `final-package-04` under the external evidence root.

| Gate | Accepted result |
| --- | --- |
| Firefox 146.0.1 offline package consumer | 32/32: public import/typecheck, Native/pthread routes, Asyncify Software/Hybrid, controls, replacement, cancellation and corrupt assets; unavailable JSPI is an expected negative case |
| Chromium 152 T3 public codec/HDR matrix | 24/24: H.264, HEVC, VP8, VP9 and AV1; PQ/HLG Software; JSPI and Asyncify |
| Firefox public Software codec/HDR matrix | 7/7 |
| Consumed PCM, both audio tracks and EOF | Chromium 4/4, Firefox 2/2; 567,808 samples compared per track with zero RMS/peak error and no interior underruns |
| Custom fonts and plain subtitles | Chromium 4/4, Firefox 2/2 |
| Embedded subtitles | Chromium 24/24: SRT, mov_text, ASS, PGS, VobSub and multiple SRT tracks across both modes/runtimes |
| Runtime/source correspondence | All 331 installed runtime files verified; all 12,727 source-companion files verified, including 225 native inputs, 409 configurations and 8,562 SDK source files |
| Licensing and isolated regression | Standalone source license/core checks pass; isolated RGB/YUV/Hybrid binaries exactly match the accepted six-case EOF/track regression |

Runtime SHA-256:
`52a506e3bd8a4a13366b00cd4217e4e7cb32e2be305231b915ed8d10c1e0c81a`.
Source SHA-256:
`4d9b98179b15c1d2cbb172a68b4382a27fe6e9e9ebe953894f96ff91c7af1f75`.

Canonical evidence: [qualification receipt](../research/items/nonisolated-full-software-playback/evidence/20260930-final-package-04/qualification.json).
The failed earlier package attempts and browser assertions remain beside the final
results. Package checks found host paths in libxml2's catalog default and copied
subtitle-renderer filenames; stable CMake configuration and compiler prefix maps
fixed both. `npm run check:build-portability` now exercises the actual recipes
before a media build, including negative controls, and binary scanning runs before
source archive creation. Firefox exposed an unrequested private Hybrid plan being
reported as missing deployment when cooperative runtimes were disabled; admission
ordering and a focused regression now preserve the intended rejection. HEAD asset
availability probes are distinguished from downloading an engine. AudioContext
checks wait for a bounded acknowledgement and record latency instead of sampling
a fixed delay; the original rejected assertion is retained.

The tested branch includes main `954729d7`. Main advanced to `5759d3e6` during
qualification. A read-only merge preview is conflict-free after the nonoverlapping
license-rule reorder, and that combined source passed TypeScript and 55 focused
routing/provider/preparation tests. This preview does not change the qualified
archive's source identity or claim a separately qualified merged binary.

### Qualification limits

This completes the agreed finite-file implementation and functional package gates.
It does not relabel every historical README row as independently tested under each
runtime. Full CPU benchmarks were excluded. Existing finite-source, resource,
codec/feature admission and browser requirements still apply. The retained 4K
continuous qualification is 5 fps, not higher frame rates; physical surround/HDR
output and other browser versions are not established by these runs. Firefox's
forced Hybrid HEVC configuration remains unsupported in the tested browser; its
Software path passes. Browser-native and Shaka keep their own source contracts.
The standard package manifest retains its beta-candidate status; this work did not
publish a release or deploy production.

## Review follow-up: timeline and provider asset ownership

A subsequent source review found two gaps outside the accepted package matrix.
The cooperative backend did not publish `seekable`, which left the public timeline
unknown and made loop/range controls reject finite files despite successful direct
seeks. It now queries mpv after loading and rejects late replies from retired loads.

Modular cooperative playback checked provider availability but bypassed verified
byte acquisition when initializing its engine. It now acquires the playback
manifest, Wasm, glue and default font through `ProviderRuntime.bytes`. The worker
uses those verified buffers; verified glue is imported from a temporary Blob URL
that is immediately revoked. Modular admission also requires the glue asset.
The public manifest read uses the same provider verification boundary.

TypeScript, licensing and 110 focused source tests passed. The focused package
follow-up uses `review-preview-server.mjs` and `review-preview-check.mjs` to verify
public seekability, seeks, whole-file/range loops, playback ranges, modular
Software/Hybrid playback and corrupt manifest/Wasm/glue rejection. The preceding
99-check archive remains immutable. The follow-up archive is bound to source
`ef838b4f501166ccc95b159c7deba21eececa7ad`; all 21 new checks passed (14 Chromium,
7 Firefox). All 331 installed runtime files and 12,763 source-companion files
were verified, and the isolated engine binaries remain byte-identical.
See [review qualification](../research/items/nonisolated-full-software-playback/evidence/20260930-review-package-02/qualification.json).
This focused follow-up qualifies the JavaScript changes and preserves the existing
format/browser/resource limits; it does not count the earlier 99 checks as a rerun
of this new archive.
