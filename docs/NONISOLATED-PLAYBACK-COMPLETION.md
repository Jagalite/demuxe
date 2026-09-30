<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Non-isolated playback production completion

The user authorized committing the existing foundation and completing and testing
this feature for production on 2026-09-30. Work continues in
`codex/nonisolated-software-20260929`. The foundation is commit `24a3a9bf`.

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
   native integration, public codec coverage, 24 embedded-subtitle cases and 20 asset/cancellation fault cases passed. Automatic fallback coverage remains pending.
5. Remove prototype-only file/duration restrictions when bounded readers, seek
   policy, resource handling and representative long/large sources pass. Qualify
   HD continuous playback and lifecycle/error/cancellation stress. The 132-second long-GOP source and 84 MiB source passed eight public mode/runtime cases; the large source read under 1 MiB with a 64 MiB heap. Eight public 720p/1080p 30 fps cases passed at full canvas resolution across both modes and runtimes; public 4K HEVC 10-bit at 5 fps passed both modes and runtimes. This does not qualify 4K at higher frame rates. Broader stress remains pending.
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

## Current remaining blockers

- HDR seek pictures match the host reference, but the original continuous PQ
  pipeline fails cadence/A/V checks. Controlled filter isolation points to the
  linear-to-SDR conversion. A private zimg candidate ports upstream's approximate
  gamma LUT to Wasm; five transfer functions passed 1,310,725 numeric samples
  against the exact scalar functions, with exact mode unchanged. Its browser continuous checks improved to 82–83 of 180 pictures but still
  failed. Combining zscale stages also failed. A second candidate adds the
  upstream inverse-transfer lookup table; dense numerical checks pass, and its
  dependency build is running. Public tone mapping remains blocked.
- The full playback heap ceiling is now 512 MiB, matching isolated Software.
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
- Native/isolated regressions, automatic fallback, and exact archive/source
  companion qualification remain pending. No production readiness or merge
  claim follows yet.

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
`20260930T172343Z-format-automatic-01`, and a corrected default-selection run
is prepared.

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
A stronger real filter workload is prepared; no adaptive transition is claimed.
Malformed private playback manifests now retain `ASSET_LOAD_FAILED` for private
routes while allowing usable Native routes to run; both sides need browser checks.

The broader routing/lifecycle rerun passed all 100 tests with its range server active (`20260930T175833Z-routing-lifecycle-regressions-02`). SPDX and license-boundary checks also passed at this checkpoint. Two adaptive workload runs produced no actual decoder pressure and therefore did not prove a policy transition; their failed transition deadlines remain recorded.

Malformed private-playback JSON/schema manifests now fail as `ASSET_LOAD_FAILED` in all eight forced Software/Hybrid runtime cases (`20260930T174851Z-manifest-faults-01`), with zero surviving workers or surfaces. Four default Native cases still play with those same malformed manifests (`20260930T174819Z-manifest-native-01`); served fault-body hashes prove the optional manifests were actually consumed.

Automatic Native playback now advertises the available full Software filter switch. Both runtime cases pass Native → filtered Software → Native with worker cleanup in `20260930T181309Z-native-filter-capability-02`. The first harness asserted immediate promotion, before the existing 200 ms scheduled promotion; that rejected assertion remains in `20260930T181136Z-native-filter-capability-01`. The production promotion policy was not changed.

The new isolated pthread regression reproduced the EOF/track-switch failure against the pre-patch main assets (`20260930T181838Z-isolated-baseline-01`): the first track passed first-picture/reference, audio, timeline and EOF checks, but selecting the second track and seeking to zero failed to present the requested position. The rebuilt patched engines must pass this same test before closeout.
