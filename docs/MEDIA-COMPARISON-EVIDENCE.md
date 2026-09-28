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

## Current table evidence

**Four compound specialist rows were reset on 2026-09-28.** The
[HDR10/TrueHD/PGS](COMPOUND-HDR10-TRUEHD-PGS-ROW.md),
[HDR10/DTS-HD/PGS](COMPOUND-HDR10-DTSHD-PGS-ROW.md) and
[Dolby Vision 5/Atmos/ASS](COMPOUND-DV5-ATMOS-ASS-ROW.md) rows have since passed
fresh bounded Auto and Software screens; their other player cells and the last
compound row still show Untested. Copied specialist audio was incorrectly subjected to the
synthetic stereo-tone oracle in the September 27 catalogue run. Older Software
and competitor cells also remain cleared pending fresh qualification. See the
[harness correction and rerun procedure](SPECIALIST-HARNESS-RESET.md). Historical
archives remain intact; their labels do not repopulate these four rows.

**The five base specialist fixtures have been validated for bounded screening.**
Fresh [source/profile and host-reference checks](BASE-SPECIALIST-FIXTURES.md)
supersede their unavailable-source explanation. The
[TrueHD](BASE-SPECIALIST-TRUEHD-ROW.md), [DTS-HD MA](BASE-SPECIALIST-DTSHD-ROW.md),
[Atmos](BASE-SPECIALIST-ATMOS-ROW.md), [Dolby Vision 5](BASE-SPECIALIST-DV5-ROW.md)
and [Dolby Vision 8.1](BASE-SPECIALIST-DV81-ROW.md) Auto rows have since passed
bounded current-source screens; TrueHD CPU remains withheld after a frame-drop
rejection. Host decoding alone did not establish playback or fidelity.

**Other Demuxe Auto rows retain their current-protocol disposition.** The
[current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) refreshes the
priority audio/subtitle rows and the remaining streaming and specialist rows.
The [earlier audio/subtitle campaign](AUTO-AUDIO-RETEST-E974CBDF.md)
records the FLAC24 audio transcoding change; see
[audio transcoding](AUDIO-TRANSCODING.md) for that policy.
Unqualified source fixtures, failed playback checks and rejected CPU windows
remain explicit instead of receiving an inferred CPU value.
Previous numbers are preserved in the
[historical CPU snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md).
See the [row refresh index](CPU-ROW-REFRESH.md) for completed measurements.
New one-browser-per-row results use three correlated rounds; their ranges and
idle trends are in each row report.

**Demuxe JSPI** and **Demuxe Asyncify** measure complete Player playback without COOP/COEP. Published README cells cover the measured file remux/transcode rows; `— Untested` makes no support claim. The [Player CPU report](JSPI-ASYNCIFY-PLAYER-CPU.md) contains matched pthread controls; existing Auto and other-player values are from separate campaigns. Qualified private mpv subtitles and restricted PCM16 audio now use the same [runtime selection](REMUX-RUNTIME.md); their separate [Player campaign](PRIVATE-MPV-PLAYER.md) retains its own fixtures and matched controls. Private Hybrid and Software remain excluded.

### Row notes

**MediaBunny column:** The [official player example](https://mediabunny.dev/examples/media-player/) is screened on each cited fixture using marked video, stereo audio, pause/resume, seeks and near-EOF settlement. 🟡 Screened remains because its public controls do not qualify 1.25× playback or independent cleanup; the dual-audio row covers the default track only. CPU is the median of three headed Chrome whole-process windows (20 seconds each, after five seconds of warmup), expressed as percent of one core. The [first-four campaign](../experiments/mediabunny-investigation/notes/official-player-first-four.md) used a separate browser run from the other columns. Subsequent rows linked in the [CPU refresh index](CPU-ROW-REFRESH.md) use one Chrome launch per row across viable player arms, with fresh contexts and rotating order. MediaBunny receives local File input while maintained players use the frozen local URL, so CPU values do not isolate decoder or demux costs. `—` means no player test for that exact row.

The external ASS row played video and audio in the MediaBunny example, but the required subtitle file could not be supplied through its controls. Its failure and the earlier CPU evidence for the other players are documented in the [row evidence](../experiments/mediabunny-investigation/notes/official-player-row-pcm24-ass-20260925/REPORT.md). The [fresh Auto measurements](CPU-GAP-CLOSEOUT.md) passed on `native-direct-ass` with a 19.8% CPU median. The earlier unusually low window remains unexplained and is retained separately; it is not pooled into this fresh median.

The [HEVC HLS follow-up](CPU-GAP-CLOSEOUT.md) corrected segment-start timestamps in the authored fixture and passed fresh correctness plus three CPU windows with zero drops; Auto now reports 14.9% CPU. Other player cells retain their prior fixture evidence.

The [AAC 5.1 row](../experiments/mediabunny-investigation/notes/official-player-row-h264-aac51-20260925/REPORT.md) used one headed Chrome launch for all player CPU arms and three rotating rounds. Its `*` means stereo output was screened; six discrete output channels were not verified. Movi's CPU samples are diagnostic because its correctness screen failed.

The [MP3/MP4 row](../experiments/mediabunny-investigation/notes/official-player-row-h264-mp3-confirmed-20260925/REPORT.md) also used one Chrome launch across all six CPU arms and three rotating rounds. Its separate Auto follow-up investigated one low matched-run window; all windows are retained in the report. AVPlayer passed the fresh full screen, replacing its earlier partial-playback label.

The [AC-3 5.1 row](../experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-confirmed-20260925/REPORT.md) screened stereo output from the six-channel source. AVPlayer and MediaBunny CPU figures are withheld because an independent launch reversed their apparent ranking. Plain video and Movi failed correctness; their CPU samples are diagnostic only.

The [E-AC-3 5.1 row](../experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-20260926/REPORT.md) used a refreshed Demuxe snapshot, one Chrome for all six CPU arms and three rotating rounds. Plain video and Movi failed correctness, so their CPU samples remain diagnostic. The four passing/screened players verified stereo output from the six-channel source, not discrete 5.1 fidelity.

The [DTS core 5.1 row](../experiments/mediabunny-investigation/notes/official-player-row-h264-dts-20260926/REPORT.md) followed the same one-Chrome-per-row CPU protocol. Plain video failed initial playback and Movi failed the rate check; their CPU samples are diagnostic. The other four arms verified stereo output, with discrete 5.1 still unqualified.

The [AC-3 stereo row](../experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-stereo-20260926/REPORT.md) used the same current Demuxe code with a frozen stereo fixture from the earlier catalogue. Auto selected Hybrid on the maintained players' local URL; an earlier local-File selective-audio result is a different input contract. CPU values are from this URL/File comparison campaign only.

The [E-AC-3 stereo row](../experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-stereo-20260926/REPORT.md) screened all five maintained players and the official MediaBunny example. Four viable/screened arms received matched CPU windows; plain video and Movi kept their failed cells without diagnostic CPU numbers.

The [DTS core stereo row](../experiments/mediabunny-investigation/notes/official-player-row-h264-dts-stereo-20260926/REPORT.md) used the same frozen stereo catalogue. Its earlier local-URL campaign selected Hybrid and had variable CPU; the [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) selected `native-transcode` and confirmed its CPU in a separate fresh launch. These campaigns are not matched CPU comparisons.

See [versions, evidence, and configured alternatives](HEAD-TO-HEAD-ROUTES.md)
and the [rerun guide](HEAD-TO-HEAD.md).

The SRT, mov_text, styled ASS, PGS and VobSub Auto cells now retain browser video with an mpv subtitle service in the [current-main retest](AUTO-MAIN-RETEST-A563F345.md). Their earlier paired CPU measurements remain in the
[historical CPU snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md).
The two H.264/AAC bitmap rows isolate subtitles by copying PGS/VobSub
from the older AC-3 cases onto browser-compatible A/V. The current AC-3/ASS Auto retest passed required subtitle drawing in three independent checks after the older intermittent failure. Other-player cells on the
older rows retain their separately linked historical results; the new bitmap
derivatives were not run through those players. Earlier Demuxe CPU evidence is in
the [unified subtitle scheduler report](../results/subtitle-visual-scheduling/REPORT.md).

The [comparison gap follow-up](COMPARISON-GAP-CLOSEOUT.md) retains its earlier bounded specialist screens. The [September 27 Auto retest](AUTO-MAIN-RETEST-A563F345.md) found missing qualified source fixtures for five specialist rows and recorded four compound HDR/PGS or Dolby Vision/ASS failures. Those four table rows were subsequently reset because the catalogue's marked-output contract did not match the specialist sources; see the correction above. Neither campaign qualifies Dolby Vision color, physical HDR, Atmos objects or discrete surround. The [earlier specialist screen](../results/head-to-head/specialist-report-01/REPORT.md) retains the historical failures and forced-Software diagnostics.

### Private mpv Player campaign

These 36-second component-derived fixtures use complete Player playback in Chrome
153 on an Apple M1. Values are medians of three 20-second whole-Chrome CPU windows,
expressed as percent of one core, with five-second warmup and the maintained
startup gate. They are separate fixtures from the README catalogue.

| Workload | pthread control | Demuxe JSPI | Demuxe Asyncify |
| --- | ---: | ---: | ---: |
| H.264 + AAC + embedded ASS / MKV | 19.8% | 22.6% | 23.2% |
| H.264 + PCM16 stereo / MKV | Withheld | 30.4% | 30.0% |

Private paths ran without COOP/COEP. The PCM row uses the corrected audio clock
controller; its pthread control is withheld because one window failed cadence.
Do not substitute an older control value. The [full report](PRIVATE-MPV-PLAYER.md)
records functional scope, hashes, rejected windows, cleanup and release limits.

## Row-by-row CPU refresh

Keep the historical snapshot intact. For each refreshed row, retain the exact
fixture and browser configuration, correctness qualification, three accepted
20-second windows, route and decoder observations, raw process CPU samples,
ranges and rejected attempts. Compare players within one campaign and state
which cells have matching fixtures and browser launches. New README rows use
one Chrome launch per fixture with three correlated rounds and per-round idle
checks. Report the within-launch limit with each absolute figure; use an
independent launch to investigate drift or surprising deltas. The multi-fixture
single-browser campaign remains exploratory. Update only the qualified row and
its provenance once its within-launch stability supports interpretation.
The [row refresh index](CPU-ROW-REFRESH.md) links each completed row to its
correctness, CPU, and interpretation records.

## Historical campaigns and interpretation

The following notes describe earlier table snapshots. For the active README cells,
start with [current table evidence](#current-table-evidence) and the linked row reports.

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
