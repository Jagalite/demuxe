<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Media comparison evidence guide

Campaign history, qualifications and source reports for the
[README comparison table](../README.md#representative-head-to-head-media-evidence-default-routes-plus-forced-software).
The [2026-09-25 historical table snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md)
preserves the figures cleared from the active README. The notes below retain
their original evidence and interpretation. References to historical numeric
cells refer to that snapshot; row and column names refer to the README.

For new measurements, follow the [project testing standard](TESTING-STANDARD.md)
and [current benchmark protocol](BENCHMARK-PROTOCOL.md). Those requirements do
not retroactively qualify the historical campaigns described here.

## Row-by-row CPU refresh

Keep the historical snapshot intact. For each refreshed row, retain the exact
fixture and browser configuration, correctness qualification, three accepted
20-second windows, route and decoder observations, raw process CPU samples,
ranges and rejected attempts. Compare players within one campaign and state
which cells have matching fixtures and browser launches. The single-browser
first pass can identify drift and prioritize follow-up; its correlated rounds
do not qualify a release CPU figure on their own. Update only the qualified
row and its provenance once independent follow-up supports interpretation.

## Scope, campaigns and interpretation

This table records complete-file experiments, not an exhaustive compatibility
matrix. Use **[component capabilities](CAPABILITIES.md)** to identify which
subsystem or requirement determines a route. The
[head-to-head catalogue](HEAD-TO-HEAD-CATALOGUE.md) retains the demonstrated
combinations and their exact evidence.

The software-decode column shows one-core CPU medians for 45 cases with three
accepted measurement rounds. Other rows show a bounded pass or a failed check. See
the linked reports for correctness limits and exact outcomes. Detailed routes,
historical outcomes and tested alternatives remain in the [complete-file
catalogue](HEAD-TO-HEAD-CATALOGUE.md).

The **Demuxe (auto)** column records automatic plan selection. The separately
recorded **Demuxe (software decode)** lane pins each media case to
`mode: 'software'`. Its [60-case correctness run](../results/head-to-head/demuxe-software-matrix-20260922-02/REPORT.md)
recorded 46 passes, no failures and 14 screen or fixture blocks. The [14-case
specialist screen](../results/head-to-head/demuxe-software-specialists-20260922-01/REPORT.md)
passed all cases; five prepared fixtures cover blocked base attempts, and nine
add specialist rows. Together they cover the 69 originally catalogued cases. A
separate [H.264/AAC bitmap-subtitle screen](../results/head-to-head/demuxe-software-bitmap-isolation-20260923-01/REPORT.md)
passed VobSub through its seeks; PGS displayed initially but lost its subtitle
after seeking.

The [forced software CPU report](../results/head-to-head/demuxe-software-performance-20260922-02/CPU-REPORT.md) contains 45 accepted three-round medians. The live HLS correctness screen passed bounded window progression, while two of its three 20-second CPU windows stopped advancing and were excluded. Software CPU values come from a separate campaign, so they are descriptive and do not enter the matched-lane bold minimums below.

Green dots in the software-decode column mark successful bounded playback;
the PGS seek failure remains red.

The [exploratory pass-cell CPU report](../results/head-to-head/passing-cell-cpu-exploratory-20260923-01/measurement/CPU-REPORT.md) adds readings to 100 of the 111 green pass cells that previously lacked CPU values, including all 47 Pass* cells. Three CPU-only rounds were attempted per cell without applying content-fidelity checks. Ninety-three cells have at least one accepted steady-window median (90 have three accepted rounds); seven more have only stalled-window readings, and 11 could not be measured because their source fixture was unavailable. † marks the median of 1–3 full, focused CPU windows advancing at approximately 1×; ‡ marks full stable CPU windows that stalled and must not be read as steady-playback cost. Historical playback labels remain unchanged.

**These are bounded playback tests, not a format-support scorecard.** Movi
0.4.0 and AVPlayer 1.3.1 are pinned versions. Their correctness cells below use
[fresh default and configured-route tests](../results/head-to-head/configured-alternatives-20260921-report-04/REPORT.md).
The pass-cell supplemental campaign added historical CPU values to previously blank green cells. Most Auto cells use the 2026-09-25 release retest; the three cells labeled `native-video-mpv-audio` use the later matched local-file production campaign. The other CPU columns retain their original campaigns. The PCM24+ASS follow-up and routing-isolation supplement below have their own matched campaigns. Configured competitor reruns collected no CPU data. Forced software CPU values elsewhere are from the separate campaign linked above.

For Movi and AVPlayer, **🟣 configured pass** means an explicitly named alternative
passed while the default failed a named check. **🟠 Plays; … failed** means initial
audio/video checks passed before a later failure. **🔴 … failed** identifies a
check that failed before initial playback was verified. A failed check does not
establish an unsupported codec. The full report includes alternatives that made
results worse as well as better; configurations beyond those tested remain
unverified. The original PCM24 + ASS native-first alternative includes a host
libass renderer, not Movi's built-in ASS renderer.

The reruns corrected Movi subtitle-track setup/selection and audio observation
for detached media elements used by streaming wrappers. Movi default and
Shaka-first now pass all six streaming fixtures. Earlier records are retained;
the linked report identifies the corrected runs that supersede them.

The [AVPlayer accuracy audit](HEAD-TO-HEAD-AVPLAYER.md) corrects an EOF
check that ran too early for timestamp-offset HLS/TS. It also distinguishes
partial fragmented-MP4 playback through full File input and WebVTT parsing
sensitivity from complete lifecycle passes. Named partial configurations are
not full passes.

Every numeric cell shows median CPU usage as a percentage of one Chrome process-family core (it can exceed 100%), not a relative gain. The **bold numeric cell** identifies the lowest median among lanes from the same matched campaign. Exploratory †/‡ readings do not enter that ranking. Existing matched medians use three accepted rounds; this is not a claim about unmeasured players or statistical superiority. † marks the separate pass-cell campaign: median of 1–3 focused, stable-process 20-second windows that advanced at approximately 1×. ‡ marks a median from full, focused stable-process CPU windows that stalled instead of advancing at approximately 1×; it is a measured stalled window, not steady-playback CPU. Round counts, ranges and records are in the linked CPU report. **Green (Pass)** preserves the historical bounded-playback result; supplemental CPU windows did not rerun its content-fidelity checks. `(Pass)*` marks the historical bounded screen with its stated fidelity, profile or duration limit. `(Fail)` means that lane’s playback correctness check failed; it does not establish an unsupported format. N/A means no demonstrated playback result for this scope. Pinned Chrome/macOS evidence; supplemental real-bitstream screening is separate; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.

The embedded SRT, mov_text and styled ASS Demuxe CPU cells come from the
[unified subtitle scheduling campaign](../results/subtitle-visual-scheduling/REPORT.md):
three accepted Native Direct old-scheduler versus new-scheduler pairs per row.
Their other-player cells retain the separately cited historical screens; those
CPU numbers are not a matched cross-player ranking for the new route.

[Raw values, ranges and exclusions](../results/head-to-head/cpu-specialist-usage-02/REPORT.md) · [Measurement protocol](CPU-BASELINE.md).

The [PCM24+ASS follow-up](COMPARISON-GAP-CLOSEOUT.md) replaces that row’s
CPU figures with a fresh matched campaign: Demuxe 46.6% versus native plus
host ASS 45.6%. Demuxe’s fresh Hybrid baseline was 56.8%, making the
new Native ASS route 18.0% lower in median CPU. These absolute values
should not be compared directly with the older campaign’s host conditions.

The six HLS/DASH rows were rerun through the maintained streaming architecture in
[the Shaka migration catalogue](../results/head-to-head/shaka-catalogue-01/REPORT.md).
Their older custom-route CPU numbers have been removed. Default HLS VOD uses
Native Direct on this Chrome platform; DASH and live HLS use `shaka-mse`.
Controlled Shaka and fallback comparisons are recorded separately in
[streaming qualification](STREAMING-QUALIFICATION.md).
The fresh bounded comparison measured Shaka HLS fMP4 at 28.6% of one core versus
29.8% for plain Native, with overlapping ranges. AV1 DASH Shaka used 37.4% less
median CPU than Hybrid on the matched synthetic fixture. These controlled-route
measurements do not replace the default-route correctness labels below.

[The routing-isolation supplement](../results/head-to-head/routing-isolations-20260923-01/REPORT.md)
adds nine deterministic synthetic rows for MPEG-2 video-only, stereo audio
controls, selective audio/subtitles, dual-track switching, H.264 High 10,
interlaced MPEG-2 and HEVC Main 10 4:2:2. Its fresh matched CPU campaign used
three accepted 20-second windows per numeric cell, including the existing
MPEG-2 + AC-3 and AC-3/E-AC-3/DTS 5.1 controls. These values have no † marker.
Movi passed the HEVC 4:2:2 correctness screen, but all three CPU windows stalled,
so that cell has no steady-playback CPU value. The linked report retains ranges,
actual routes and failed-window records.

The [performance-opportunity investigation](../experiments/performance-opportunities/REPORT.md)
adds separate matched MPEG-2 + AC-3 and HEVC Main10 + AC-3/E-AC-3/DTS
comparisons, route traces, and small audio-copy and text-cue probes. Its
MPEG-2 four-arm rerun did not reproduce the large apparent Movi advantage from
older, mixed campaigns; Demuxe auto and forced Software selected the same
Software route. The HEVC audio controls did not establish a material AVPlayer
advantage or isolate mpv audio CPU. These runs use their own frozen fixtures
and harnesses, so their medians do not replace or combine with the matrix
cells below. Component CPU attribution and discrete-channel fidelity remain
open for the proposed audio-service architecture.

The separate [real-resolution performance screen](../results/head-to-head/real-resolution-20260923-01/REPORT.md)
uses five 1080p/4K synthetic fixtures and one fresh matched campaign. Demuxe
Auto's Native Direct H.264 1080p60 median was 53.3% of one core versus 51.4%
plain browser; 4K24 HEVC Main10 + AAC was 44.7% versus 49.6%, with overlapping
round ranges. On the same 4K HEVC video packets with TrueHD + PGS, Auto kept
browser WebCodecs video in Hybrid at 65.1% versus 127.9% forced Software.
Those measurements do not replace or combine with the compatibility matrix.

**Auto CPU provenance:** Most refreshed Auto cells use [2026-09-25 frozen-URL fixtures](../results/head-to-head/release-auto-20260925-report/REPORT.md) and three accepted Chrome CPU rounds when available. The three cells labeled `native-video-mpv-audio` instead use the [newer matched local-file production campaign](../results/selective-production/REPORT.md), because this route currently admits local files only. Those fixtures are H.264 High 1080p60 + 48 kHz stereo AC-3 or DTS core, and SDR HEVC Main10 1080p30 + 48 kHz stereo AC-3. These are different bitstreams from the older URL fixtures; CPU values from different campaigns are not fine-grained cross-row comparisons. Other CPU columns retain earlier campaigns. Screened specialist cells do not establish HDR, spatial or physical output fidelity. Failed Movi/AVPlayer CPU figures are diagnostic observations during failed playback, not efficiency comparisons.

For these three qualified local-file combinations without subtitles, `native-video-mpv-audio` replaces Hybrid's retained-frame visible-canvas path with browser `<video>` presentation. Matched production mean savings versus Hybrid on the same files were **16.4 core points** for H.264/AC-3, **14.4** for H.264/DTS, and **11.0** for HEVC Main10/AC-3; these savings do not apply to other rows.
