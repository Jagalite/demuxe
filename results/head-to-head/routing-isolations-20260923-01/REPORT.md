# Routing-isolation head-to-head supplement

This supplement adds nine synthetic catalogue rows to separate video-route,
audio-codec, channel-count, track-selection, subtitle, profile and interlace
questions. All outputs are deterministic 36-second 320×180, 30 fps marked
fixtures; no licensed media is used.

## Runs and scope

- [Correctness report](../routing-isolations-correctness-20260923-01/REPORT.md)
  · [summary](../routing-isolations-correctness-20260923-01/summary.json)
- [Matched 45-cell correctness rerun](../routing-isolations-correctness-20260923-04/summary.json)
  · [three-round CPU report](CPU-REPORT.md)
  · [performance summary](../routing-isolations-performance-20260923-02/summary.json)
- [Frozen asset manifest](../routing-isolations-correctness-20260923-01/assets-manifest.json)
  · [FFmpeg/ffprobe command log](../routing-isolations-correctness-20260923-01/files/preparation/commands.json)
  · [fixture probes and stream catalogue](../routing-isolations-correctness-20260923-01/files/preparation/fixtures/catalogue.json)
  · [fixture generator](../routing-isolations-correctness-20260923-01/files/preparation/sources/expand.py)
- Full browser identity: **chromium/153.0.8010.53/chrome/headed**. Fixture asset
  SHA-256: **b877a99e1e867c5f3ad2b41f0c31c08fbde2dd3d7ec2d86ff8fccf082c2dee1f**.
  Harness SHA-256: **2195d788b10ed42d7638faa43635cebf29392804a81a4adbc3aecedf64154df5**.
- The correctness selection contained 53 cells: 36 passed, 16 failed and one
  auxiliary routing control was blocked. The nine README rows account for 31
  passing and 14 failing cells. The other eight cells are the existing MPEG-2
  + AC-3 comparison and auxiliary dual-audio controls.
- The fresh CPU qualification reran its 36 passing cells with nine AC-3,
  E-AC-3 and DTS 5.1 control cells: **45 passed, zero failed**. The three-round
  performance campaign then accepted **132 of 135 windows**. Movi's three HEVC
  4:2:2 windows stalled; the other 44 cells have accepted three-round medians.

The harness kept its existing marked audio/video, pause/resume, playback-rate,
forward/backward seek, near-EOF and cleanup checks. The ASS row also checks the
marked subtitle initially and after seeks. The dual-audio Demuxe case records
track IDs and switches AAC → AC-3 → AAC during playback. The 5.1 controls use
the same marked stereo-output screen as the existing catalogue; their fixture
`screenLimit` states that discrete channel fidelity is unqualified. Their
three-round CPU measurements do not remove that `(Pass)*` caveat.

## Generated fixtures

The preparation log contains the exact argument vector for every FFmpeg and
ffprobe invocation. The media hashes below match the frozen asset manifest.

| Fixture | ffprobe identity | Media SHA-256 |
| --- | --- | --- |
| MPEG-2 video-only / MPEG-TS | MPEG-2 Main, yuv420p, progressive; 36.000 s | **ffed2c71c683d7b18d0ea407eb37484523e61be768103f709116e359e294773a** |
| H.264 + AC-3 stereo / MKV | H.264 High, yuv420p + AC-3, 48 kHz stereo | **39ace6a005eb592fe13fe4da7e5f568da0c20a2c73cb051f59a26890044c7d8d** |
| H.264 + E-AC-3 stereo / MKV | H.264 High, yuv420p + E-AC-3, 48 kHz stereo | **9838ead115d38776bdc553bfd263267be6f0e39fb57ebbfc54c190ad18cf99b6** |
| H.264 + DTS core stereo / MKV | H.264 High, yuv420p + DTS core, 48 kHz stereo | **8f070aac0d9588cc842ca264be6d5ad53af58cc235a67063db1843822d8517ad** |
| H.264 + AC-3 stereo + ASS / MKV | H.264 High, yuv420p + AC-3 stereo + ASS | **83226e6106dbbc0c7e04f72816d27c6e81b7bdb94fe2a8c91f2ea70196b1a00a** |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | H.264 High, yuv420p; AAC-LC stereo default; AC-3 stereo non-default; 48 kHz | **805810e7fda17982c0f4f5702c05943a177f413d2f10ead74cc6f18e00847437** |
| H.264 High 10 + AAC / MKV | H.264 High 10, yuv420p10le + AAC-LC stereo | **888be972e5b68d05e189e5ee59b1597a11ed275e91de5b0bada36da26fc20c7c** |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | MPEG-2 Main, yuv420p, top-field-first (tt) + AC-3 stereo; ffprobe frames report interlaced and top-field-first | **7e418266b4d0953fe909195a990dc6a4a11c699c3fcae488f854d53e33964a0c** |
| HEVC Main 10 4:2:2 + AAC / MKV | HEVC Rext, yuv422p10le + AAC-LC stereo | **a8acabf0d496f80ba57b6235548daa98591dada3a1e8882e0988a70ac46faf61** |

The MPEG-2 video-only and existing MPEG-2 + AC-3 fixtures have identical
video-packet SHA-256 **348fcb8f59c2b714a5685821925ebd8d3c26bcf5fe8bc06176a6e5302dcf6775**.
The dual-audio asset is one file shared by the default-AAC and AC-3-selection
scenarios; AAC is stream ID **1:audio:stream:1** (default), AC-3 is
**1:audio:stream:2** (non-default).

## Correctness and observed routes

**Native video** is the plain browser media element. **Custom** is the observed
default route label for Movi and AVPlayer. Demuxe auto modes and execution-plan
components are recorded explicitly. The observed Demuxe `native-direct` plan
uses browser video and original browser audio; `hybrid` uses WebCodecs video
and mpv audio, with mpv/libass subtitles when ASS is present; `software` uses
ffmpeg video and mpv audio where the fixture has audio. The forced-Software
lane selected that same `software` plan for every fixture. The `Custom` label
does not by itself identify a competitor's internal decoder.

| Combination | Native video | Demuxe auto | Demuxe forced Software | Movi 0.4.0 | AVPlayer 1.3.1 |
| --- | --- | --- | --- | --- | --- |
| MPEG-2 video-only / MPEG-TS | Fail at open: browser rejected source | Pass · Software (ffmpeg video) | Pass · Software | Pass · Custom | Pass · Custom |
| H.264 + AC-3 stereo / MKV | Fail: marked audio did not arrive | Pass · Hybrid (WebCodecs video + mpv audio) | Pass · Software | Initial output, then fail: audio after seek 1 | Pass · Custom |
| H.264 + E-AC-3 stereo / MKV | Fail: marked audio did not arrive | Pass · Hybrid (WebCodecs video + mpv audio) | Pass · Software | Initial output, then fail: audio after seek 10 | Pass · Custom |
| H.264 + DTS core stereo / MKV | Fail: marked audio did not arrive | Pass · Hybrid (WebCodecs video + mpv audio) | Pass · Software | Initial output, then fail: playback-rate progression | Pass · Custom |
| H.264 + AC-3 stereo + ASS / MKV | Fail: initial audio check | Pass · Hybrid (WebCodecs video + mpv audio + mpv/libass subtitles) | Pass · Software | Fail: marked subtitle drawing | Fail: marked subtitle drawing |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | Pass · browser default AAC | Pass · Native Direct on AAC; switches to Hybrid on AC-3 and back to Native Direct on AAC | Pass · Software; switches both tracks | Fail · near-EOF wait timed out | Pass · Custom |
| H.264 High 10 + AAC / MKV | Pass · browser native | Pass · Native Direct | Pass · Software | Fail · near-EOF wait timed out | Pass · Custom |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | Fail at open: browser rejected source | Pass · Software (ffmpeg video + mpv audio) | Pass · Software | Initial output, then fail: audio after seek 6 | Pass · Custom |
| HEVC Main 10 4:2:2 + AAC / MKV | Pass · browser native | Pass · Native Direct | Pass · Software | Pass · Custom | Pass · Custom |

All passing Demuxe auto rows completed their declared lifecycle checks. In the
ASS row, subtitle stream **1:sub:stream:2** remained selected and the marked
drawing appeared initially and after seeks. In the dual-audio auto row the
selected identities were:

- AAC: **1:audio:stream:1**, title **Marked AAC stereo**, stream 1, default,
  two channels.
- AC-3: **1:audio:stream:2**, title **Marked AC-3 stereo**, stream 2, non-default,
  two channels.

The recorded transition switched AAC → AC-3 → AAC while keeping the accepted
position and marked audio. The AAC default stayed Native Direct until AC-3 was
selected; selecting AC-3 promoted playback to Hybrid. The AAC-only default was
therefore not escalated because an unselected AC-3 stream was present. A
separate auto-on-open AC-3 helper case tripped the adapter's immediate
selection-settle assertion; its failure snapshot already shows AC-3 selected.
The in-playback AC-3 selection above is the passing proof. The Software-on-open
AC-3 helper passed.

The interlaced fixture is verified as top-field-first MPEG-2, but Demuxe's
reported videoFilters value is empty. No explicit deinterlacer was selected in
this route. Manual inspection of Demuxe's [moving screenshot](../routing-isolations-correctness-20260923-01/demuxe.auto.mpeg2-interlaced-ac3/moving.png)
and [post-seek screenshot](../routing-isolations-correctness-20260923-01/demuxe.auto.mpeg2-interlaced-ac3/seek-6.png)
shows a serrated alternating-line edge on the moving square; the [progressive
MPEG-2 comparator](../routing-isolations-correctness-20260923-01/demuxe.auto.mpeg2-ac3/moving.png)
has a straight edge. This is visible combing, consistent with no deinterlacing
in the observed route. The automated marker/lifecycle checks pass, but they do
not certify deinterlaced output or quantify visual quality.

## CPU and analysis

All values below are medians of **three accepted 20-second advancing-playback
windows**, after separate five-second warmups, measured in percent of one
headed Chrome process-family core. They come from one frozen-asset, unchanged-
harness campaign. The [CPU report](CPU-REPORT.md) gives all 45 cell IDs,
observed routes and selected tracks, three-round ranges, and links to each raw
window. A `—` means the lane failed correctness and was not measured. `Stalled`
means correctness passed but none of Movi's three HEVC 4:2:2 CPU windows
advanced enough to satisfy the existing performance acceptance check.

| Fixture or matched control | Native video | Demuxe auto | Forced Software | Movi | AVPlayer |
| --- | ---: | ---: | ---: | ---: | ---: |
| MPEG-2 video-only | — | 52.8% | 51.8% | 43.2% | 32.9% |
| MPEG-2 + AC-3, same video packets | — | 65.2% | 62.7% | 58.4% | 57.8% |
| H.264 + AC-3 stereo | — | 58.7% | 52.5% | — | 57.8% |
| H.264 + AC-3 5.1 control | — | 58.0% | 68.8% | — | 61.8% |
| H.264 + E-AC-3 stereo | — | 54.6% | 61.8% | — | 56.8% |
| H.264 + E-AC-3 5.1 control | — | 49.1% | 49.6% | — | 38.5% |
| H.264 + DTS stereo | — | 55.3% | 64.0% | — | 60.5% |
| H.264 + DTS 5.1 control | — | 62.3% | 65.8% | — | 60.5% |
| H.264 + AC-3 stereo + ASS | — | 61.7% | 62.2% | — | — |
| Dual-audio, AAC selected | 41.7% | 46.2% | 65.7% | — | 59.3% |
| H.264 High 10 + AAC | 49.3% | 51.0% | 71.4% | — | 65.8% |
| Interlaced MPEG-2 + AC-3 | — | 72.6% | 71.9% | — | 65.2% |
| HEVC Main 10 4:2:2 + AAC | 49.9% | 52.5% | 71.1% | Stalled | 67.2% |

An earlier partial performance run and ENOSPC browser-launch attempts are
preserved as diagnostic records. After disk space became available, the
complete matched correctness and CPU runs above superseded them. The only
CPU failure in the completed campaign is Movi HEVC 4:2:2; its failed windows
are retained in the CPU report. CPU medians are descriptive and their ranges
sometimes overlap.

Findings:

- **No incorrect audio/profile route selection** appeared on the new rows.
  H.264 plus
  AC-3/E-AC-3/DTS selects Hybrid and retains WebCodecs video while mpv decodes
  audio. High 10 and HEVC 4:2:2 both select Native Direct in this Chrome 153
  environment. Their auto medians are about 20 points below forced Software.
- **Unselected AC-3 did not affect AAC routing.** The dual-track default stayed
  Native Direct until AC-3 was selected. The route changed only for the
  selected track, then returned to Native Direct on AAC. The default-AAC CPU
  windows also recorded Native Direct and selected stream `1:audio:stream:1`
  in all three rounds. Auto was 46.2% versus 65.7% forced Software.
- **MPEG-2 remains costly without audio.** Video-only auto measured 52.8%,
  versus 43.2% Movi and 32.9% AVPlayer. With identical MPEG-2 video packets,
  adding AC-3 raised the paired medians by 12.4 points for Demuxe auto,
  10.9 for forced Software, 15.2 for Movi and 24.9 for AVPlayer. This is an
  audio/mux/presentation increment, not a pure codec-decoder attribution.
  The Demuxe-versus-AVPlayer video-only gap is about 19.9 points, so audio
  cannot explain the apparent MPEG-2 competitor gap by itself.
- **Stereo did not consistently reduce audio-case CPU.** Demuxe auto AC-3
  stereo/5.1 measured 58.7/58.0%, E-AC-3 54.6/49.1%, and DTS 55.3/62.3%.
  Only DTS showed a roughly seven-point stereo reduction in auto; the other
  pairs did not. The forced Software AC-3 pair fell 16.3 points on stereo.
  Round ranges and sequential campaign order limit causal interpretation.
- **Interlace has no chosen deinterlace filter in the observed Software plan.**
  The interlaced auto median was 72.6%, 7.4 points above progressive MPEG-2
  + AC-3; forced Software and AVPlayer rose about 9.2 and 7.4 points.
  Interlaced and progressive fixtures differ in picture content and encoding,
  so this does not isolate deinterlacing CPU. The screenshots show visible
  combing; deinterlacing correctness after the LGPL migration is not established.
- **Selective audio and subtitles retain native video.** The AC-3 + ASS case
  uses Hybrid overall, with browser WebCodecs video and mpv audio/subtitle
  services. Auto measured 61.7% versus 62.2% forced Software, with overlapping
  ranges; no performance win is established by that small median difference.
- **HEVC 4:2:2 did not expose a new fallback boundary** on this browser: the
  tested Main 10 Rext/yuv422p10le file passed Native Direct. Forced Software
  also passed, but no automatic Hybrid boundary was selected. Movi passed the
  bounded correctness screen but stalled in every steady CPU window.

The new optimization opportunity is the **MPEG-2 Software video path**: its
video-only median remains about 9.6 points above Movi and 19.9 above AVPlayer
before audio enters the comparison. A decode-versus-presentation profile is
needed before changing that path. Separately, the interlaced route should be
checked with a visual field-quality oracle because no deinterlacer was
reported and visible combing remains. Neither finding justifies a route
redesign from these fixtures.

## Keep these rows

| Row | Recommendation |
| --- | --- |
| MPEG-2 video-only / MPEG-TS | Keep permanently; directly isolates the existing MPEG-2 competitor gap. |
| AC-3 stereo, E-AC-3 stereo and DTS stereo | Keep permanently beside each 5.1 row; the matched CPU results reject a blanket stereo-saves-CPU assumption. |
| H.264 + AC-3 stereo + ASS | Keep permanently; demonstrates native video with selective audio and subtitle handling. |
| Dual-audio H.264 + AAC + AC-3 stereo | Keep permanently; records selected stream identities and route change on switching. |
| H.264 High 10 + AAC | Keep permanently with its synthetic, 320×180 and browser-specific qualification. |
| Interlaced MPEG-2 + AC-3 stereo | Keep as a deinterlacing investigation row; the bounded playback pass coexists with visible combing and no selected filter. Add an image-quality oracle before treating it as a deinterlacing pass. |
| HEVC Main 10 4:2:2 + AAC | Keep permanently as the profile and pixel-format boundary case. |

The optional ProRes video-only row was not added; the nine requested isolation
rows are complete.
