<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe component capabilities

This is the canonical reference for **what each Demuxe subsystem does**. The
[head-to-head catalogue](HEAD-TO-HEAD-CATALOGUE.md) remains the complete-file
experimental evidence catalogue: it answers **which combinations have actually
been demonstrated**. Neither table implies the Cartesian product of its rows works.

Forced-software evidence reviewed 2026-09-22 against `/Volumes/seed2/Projects/demuxe` at
`283a8effb99c356f1d6eb8ee8163628bb6fa7493`. The streaming architecture section now reflects the
Shaka migration and its [fresh bounded qualification](STREAMING-QUALIFICATION.md); the new route is not qualified by older
custom-scheduler results. Historical results retain their own source, engine,
fixture and browser identities. A research result is not production integration.

[Video codecs](#video-codecs-and-profiles) · [Audio codecs](#audio-codecs-and-profiles) ·
[Containers](#containers--demuxing) · [Subtitles](#subtitles) ·
[Pixel formats](#video-characteristics--pixel-formats) · [Color/HDR](#color--hdr) ·
[Audio output](#audio-layouts--output) · [Sources/streaming](#streaming--source-types) ·
[Processing/playback](#processing-and-playback-features) · [Composition example](#composition-example-mkv-with-hevc-main10-sdr--dts-core--embedded-ass)

## Routing and how to read this reference

Public modes are **`native`, `hybrid`, `software`**. **Native Direct** and **Native
Remux** and **Shaka/MSE** are subroutes of `native`, not extra public tiers. Direct leaves
source bytes and A/V decoding/presentation with the browser. Remux uses FFmpeg to
copy selected compressed packets into browser-accepted MP4/WebM, then the browser
decodes them. Optional audio adaptation is explicitly identified below; it is
**decoding and re-encoding audio**, not packet-copy remux.

Hybrid uses FFmpeg/mpv demux and audio, WebCodecs video and retained-frame
presentation, with mpv subtitle/timing ownership. Software uses FFmpeg video too.
Native retains one media-element A/V clock; Hybrid/Software retain mpv timing and
PCM/output-latency feedback. WebCodecs use does not establish hardware acceleration,
zero-copy output, or HDR fidelity.

The finite [plan registry](../src/internal/playback-plans.ts),
[selected-source guards](../src/internal/selection.ts) and
[orchestrator](../src/unified-player.ts) intersect **all selected component
requirements**, source policy, output requirements and deployment availability.
Ordinary files prefer Direct, then eligible packet-copy Remux, narrowly permitted
adaptation, Hybrid and Software. Adaptive sources prefer an eligible browser HLS
Direct trial, then Shaka/MSE, then a semantically eligible Hybrid/Software fallback. This is a policy preference, not a universal CPU ranking.
Actual startup/output must pass. A component requiring FFmpeg audio need not force
software video; an exact CPU video filter does. Unsupported required subtitles
cannot be silently discarded. Explicit modes pin their family; terminal source,
permission or cancellation failures do not become codec fallback.

Component tables retain four route columns; the streaming table adds Shaka/MSE.
Each capability table also has a separate forced software decode evidence
column, followed by its preferred/fallback order and scoped capability status.
The status glossary and configuration or policy tables describe terminology or
settings, not playback cases, so they do not carry this evidence column. Playback
evidence does not promote an untested variant.
Route-cell notation:

- **B**: browser-owned attempt; support depends on browser/OS, exact configuration,
  source and observed output. It does **not** mean this route was tested for every row.
- **C**: implemented compressed-packet copy contract, followed by browser decoding;
  exact MIME/configuration/timestamps must be accepted. No Demuxe decode is implied.
- **W**: implemented WebCodecs bridge; actual configuration and frame delivery required.
- **F**: FFmpeg/mpv decoding or handling implemented; only the explicitly cited
  variants are tested. Sharing an audio decoder with Software does not independently
  qualify its Hybrid lifecycle.
- **No**: this Demuxe route does not provide/admit the capability. **?**: no adequate
  route-specific evidence; not a claim of impossibility. **Lab**: research only.
- **D → R → H → S** means prefer eligible Direct, then Remux, then Hybrid, then
  Software; omit ineligible steps. An arrow is a fallback candidate, not a guarantee
  the next route can satisfy all other requirements. `S` alone has no further route.

Qualification vocabulary (applies only to the stated scope):

| Status | Meaning |
| --- | --- |
| **qualified** | Explicit acceptance record for a declared profile/platform and checks; not universal or current-release certification. |
| **functional/bounded** | Recorded output/contract checks within stated fixtures, duration and browsers; broader fidelity/endurance not established. |
| **experimental** | Opt-in or lab component; successful narrow tests do not promote automatic routing. |
| **blocked** | A required check failed, or fixture/assets/oracle are unavailable; the reason is stated. |
| **unsupported** | Absent/rejected by current implementation or policy for that route/feature. |
| **untested** | Implemented, theoretical or registered possibility without sufficient playback evidence for the variant. |

A row may have different statuses for decoding, fidelity or different routes.
Unlisted profiles are **untested**, not implicitly supported. Most recent catalogue
screens use Chrome 153/macOS; older Chrome/Firefox checks apply only to their exact
artifacts. Safari/mobile and broad platform performance are not qualified here.

The **Software decode evidence** column summarizes the forced Software runs in
the [60-case playback matrix](../results/head-to-head/demuxe-software-matrix-20260922-02/REPORT.md),
the [14 specialist screens](../results/head-to-head/demuxe-software-specialists-20260922-01/REPORT.md),
and a [two-case H.264/AAC bitmap-subtitle screen](../results/head-to-head/demuxe-software-bitmap-isolation-20260923-01/REPORT.md)
from the current asset snapshot. The older software format matrix is fixture-level
decode/seek evidence, linked in its codec sections; it is not counted as a forced
full-player result here. **Pass** means the matching forced-software fixture
passed its recorded playback checks. **Limited** means playback was bounded or an
exact required output check failed under a condition stated in that row or its
fixture. **Not tested** means there is no matching forced-software playback result
for that capability in these runs; it does not erase separate component-level
evidence. **N/A** means software decoding does not apply to the capability. The
current playback matrix ran on headed Chrome 153.0.8010.53/macOS: 46 passed, none
failed, and 14 were blocked (nine completed multichannel/HDR screens retained
fidelity limits; five specialist combinations lacked a usable fixture or oracle).
The separate specialist screen passed 14/14, including those five formats with
prepared fixtures. The HLS live screen passed with bounded duration. The
supplementary bitmap screen passed VobSub and failed to retain PGS subtitles after
a seek; its report records the Chrome 153 player-source snapshot (`7baf765`).
These runs do not qualify lossless or surround output, spatial objects, Dolby
Vision color, physical HDR, CPU performance or unlisted combinations.

## Video codecs and profiles

Evidence: [codec bridge and limits](../web/video-codec-config.js),
[configuration tests](../tests/video-codec-config.mjs),
[remux implementation](../native/remux/remux.c),
[broad-routing record](../results/broad-routing/README.md),
[software format matrix](../results/format-matrix/README.md) and its
[exact profiles/pixel formats](../results/format-matrix/fixtures.json),
[compatibility expansion](COMPATIBILITY-EXPANSION.md), and
[marked complete-file evidence](HEAD-TO-HEAD-CATALOGUE.md).

| Codec / profile / variant and handling | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AVC/H.264, progressive 8-bit 4:2:0; avcC or Annex B parameter/packet handling | B | C; SPS/PPS validation | W | F | Pass | D → R → H → S | **functional/bounded** across routes; Constrained Baseline software fixture and High SDR acceptance exist. High 1080p software has **qualified** historical M2 scope, not all AVC levels. |
| AVC High 10, 4:2:2 / 4:4:4 and other profiles | B, ? | C configuration path, ? | W only if accepted, ? | F, exact variant ? | Not tested | D → R → H → S conditionally | **untested** as a general profile set; configuration parsing is not high-depth/chroma playback proof. No claim from decoder registration. |
| HEVC Main 8-bit 4:2:0, MP4 `hvc1` / `hev1` | B | C; hvcC/Annex B parameter sets | W | F | Pass | D → R → H → S | **functional/bounded** Direct fixtures for both tags; broader remux/Hybrid and software Main evidence. Exact tag/configuration still browser-dependent. |
| HEVC Main 10, 10-bit 4:2:0 SDR | B | C; exact profile acceptance | W | F; bounded Main10 SDR lifecycle passed with DTS-HD input | Pass | D → R → H → S | **functional/bounded** Direct and Hybrid screens, including MKV AAC/FLAC/Opus stereo and Hybrid FLAC/Opus + embedded ASS; not HDR fidelity. Do not transfer Main8 software proof to every Main10 variant. |
| HEVC range extensions / 12-bit / 4:2:2 / 4:4:4 | B, ? | C parser path, ? | W configuration path, ? | F possibility, ? | Not tested | First route with verified output; S candidate | **untested** exact variants; no end-to-end profile guarantee. |
| VP8 | B | C into WebM | W | F | Pass | D → R → H → S | **functional/bounded**; prepared video needs compatible Opus/Vorbis selected audio. |
| VP9 profile 0, 8-bit 4:2:0 | B | C MP4/WebM; keyframe metadata | W | F | Pass | D → R → H → S | **functional/bounded**; remux derives missing chroma/range metadata without decoding. |
| VP9 profile 2, 10-bit SDR | B | C path | W path | F, variant ? | Pass | D → R → H → S | **functional/bounded** Direct screen; bridge string is unit-tested. Forced R/H/S qualification is not implied by the Direct pass. |
| VP9 profiles 1/3 or 12-bit; non-4:2:0/RGB variants | B, ? | C parser path | W configuration path | F possibility, ? | Not tested | Verified eligible route only | **untested** playback; profile 2/12-bit header tests prove metadata parsing only. Parser derives 420/422/440/444/GBR as appropriate; this is not output fidelity. |
| AV1 Main 8/10-bit 4:2:0 | B | C MP4/WebM | W | F via dav1d | Pass | D → R → H → S | **functional/bounded** Native 8/10-bit screens, Hybrid AV1 DASH case, software 8/10-bit compatibility checks. Older pre-dav1d failure is historical. |
| AV1 High/Professional, 12-bit, other chroma | B, ? | C configuration path | W configuration path | F possibility, ? | Not tested | Verified eligible route only | **untested**; bridge can describe profiles 0–2 and depths 8/10/12, not prove their playback. |
| MPEG-1 / MPEG-2 video | B, no established route | No | No bridge | F | Limited | S | **functional/bounded** Software; old seek failures have later MPEG preroll corrections. Interlacing quality is separate. |
| MPEG-4 Part 2, including tested `mpeg4`, MSMPEG4v2/v3 | B, ? | No | No bridge | F | Pass | S | **functional/bounded** Software decode/seek fixtures; not every DivX/Xvid bitstream/profile. |
| ProRes Proxy 10-bit 4:2:2; additional generated ProRes screen | B; tested source rejected | No | No bridge | F → RGB presentation | Pass | S | **functional/bounded**; no general ProRes 4444/alpha fidelity claim. |
| CineForm 10-bit 4:2:2; DNxHR LB 8-bit 4:2:2 | B, ? | No | No bridge | F → RGB | Not tested | S | **functional/bounded** two-second software fixtures; other CineForm/DNxHD/HR profiles **untested**. |
| FFV1 8-bit 4:2:0; HuffYUV, FFVHuff, UTVideo, MagicYUV | B, ? | No | No bridge | F | Not tested | S | **functional/bounded** exact software fixtures, not arbitrary lossless pixel/alpha fidelity. |
| MJPEG, WMV1/2, RV10/20, H.261/H.263, and other demonstrated legacy video | B, ? | No | No bridge | F | Not tested | S | **functional/bounded** for named fixtures in the software matrix; registration alone never extends this set. |

## Audio codecs and profiles

Hybrid and Software decode selected audio in FFmpeg/mpv, then render PCM through
AudioWorklet/Web Audio. They do not use WebCodecs AudioDecoder. Native packet copy
is not encoded-bitstream passthrough to an AVR: the browser still decodes/output-mixes.
Sources: [audio packet contracts](../native/remux/remux.c),
[adaptation precision guards](../native/adaptation/flac.h),
[software decode evidence](../results/software-full/functional-2026-09-08T19-39-43.145Z/result.json),
[format matrix](../results/format-matrix/README.md),
[component audio failures](HYBRID-COMPONENT-STUDY.md), and [catalogue](HEAD-TO-HEAD-CATALOGUE.md).

| Codec / variant and handling | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AAC-LC, mono/stereo; tested stereo 44.1/48 kHz | B | C ASC; ADTS→ASC framing | F | F | Pass | D → R → H → S | **functional/bounded**; historical software AAC stereo profile **qualified**. ADTS path requires LC, valid rate/channel configuration and one raw-data block. |
| AAC multichannel / 5.1 | B | C preserves compressed config | F | F | Limited | D → R → H → S; H/S for explicit PCM layout | **functional/bounded** screen through stereo output; discrete speaker fidelity unqualified. |
| HE-AAC and other non-LC ASC profiles | B, ? | C copies valid non-ADTS ASC | F, ? | F, ? | Not tested | D → R → H → S conditionally | **untested** profile matrix. Non-LC ASC metadata handling does not qualify HE-AAC decoding; ADTS restrictions still apply. |
| MP3 | B | C into MP4 if MSE accepts | F | F | Pass | D → R → H → S | **functional/bounded**; some recorded MP4 MSE rejections use Hybrid despite Direct MP3 success. |
| Opus | B | C WebM or MP4, delay/discard handling | F | F | Pass | D → R → H → S | **functional/bounded** stereo/audio-only cases. Copy existing Opus differs from optional lossy encoding below. |
| Vorbis | B | C WebM only | F | F | Pass | D → R → H → S | **functional/bounded**; video must fit WebM (VP8/VP9/AV1), no AVC+Vorbis prepared mux contract. |
| FLAC, 16/24-bit stereo | B | C into MP4, STREAMINFO/sample depth | F | F | Pass | D → R → H → S | **functional/bounded**; Native decoding is browser-owned, not sample-exact output proof. |
| FLAC 5.1 | B | C path | F | F | Limited | D → R → H → S | **functional/bounded** Native stereo-output screen; surround fidelity unqualified. |
| AC-3 / E-AC-3 (not Atmos) | B; selected audio failed tested Chrome cases | C contract, browser acceptance may fail | F | F | Limited | H → S on tested platform; D/R if actually accepted elsewhere | **functional/bounded** decode; 5.1 screens do not qualify discrete channels. Existing lossless adapter rejects these codecs. |
| DTS core, stereo / 5.1 | B; selected audio failed tested cases | No DTS copy contract | F | F | Limited | H → S | **functional/bounded** Hybrid and Software decoding; 5.1 output fidelity unqualified. DTS is not a software-video requirement. |
| DTS→FLAC selective adaptation | B unchanged source only | Not copy: optional adaptation guards | F original DTS | F original DTS | Not tested | H → S for current tested DTS inputs | **experimental / blocked** tested adaptation: 5.1 rejected by mono/stereo gate; stereo with unknown 16/24-bit precision rejected. Compiled `dca` is not successful adaptation evidence. |
| DTS-HD MA 7.1 / extension fidelity | Tested picture without required audio | No DTS copy contract | F; bounded default lifecycle passed | F; explicit bounded lifecycle passed | Limited | H → S demonstrated with eligible HEVC | **functional/bounded** picture/audio/seek through Hybrid, using an eight-second real excerpt repeated to 36 seconds. No claim of MA extension decoding, losslessness or discrete 7.1 output. |
| TrueHD / MLP stereo, 24-bit 48 kHz TrueHD fixture | B, ? | No copy contract | F shared audio path, route-specific ? | F | Not tested | S demonstrated; H candidate with eligible video | **functional/bounded** Software decode/seek; **untested** exact Hybrid variant. |
| TrueHD 7.1 | Tested picture without required audio | No copy contract | F; bounded default lifecycle passed | F candidate; narrower stereo Software proof also exists | Limited | H demonstrated with eligible HEVC; S candidate | **functional/bounded** Hybrid playback, seek and cleanup with repeated ~0.107-second genuine 7.1 regression audio. Discrete channels, losslessness and long-form audio remain unqualified. |
| E-AC-3 Atmos / object metadata | Tested picture without required audio | C E-AC-3 packets only, no object renderer | Base audio F; default lifecycle passed | Base audio F; no object renderer | Limited | H demonstrated for base audio; no qualified object-output route | **functional/bounded** copied JOC-bearing input through Hybrid; object-based rendering **unsupported**. Base audio playback is not Atmos fidelity qualification. |
| PCM S16LE/S24LE, mono/stereo | B; WAV and selected MKV examples | No PCM copy contract; optional FLAC adaptation | F | F | Pass | D → eligible adaptation → H → S | **functional/bounded** direct and software; adaptation **experimental**, see below. |
| PCM24 5.1 | B; screen only | No copy; adaptation rejects multichannel | F | F | Limited | D → H → S; H/S for explicit layout | **functional/bounded** encoded-input screen, not channel fidelity. |
| Other PCM: signed 8/16/24/32/64, unsigned 8/16/24/32, float32/64, BE/LE, selected planar variants; A-law/μ-law | B, exact variant ? | No copy contract; no general lossless adapter | F shared path, variant ? | F | Not tested | D if verified; H/S, S demonstrated | **functional/bounded** Software fixtures in matrix; not bit-exact browser output or every packing/layout. |
| ALAC 16-bit stereo 48 kHz | B, ? | No Demuxe copy contract | F shared path, ? | F | Not tested | D if verified → H/S | **functional/bounded** Software; no route-specific Native/Hybrid claim. |
| MP2, WavPack, TTA, WMA1/2, tested ADPCM/G.72x variants | B, ? | No copy contract | F shared path, ? | F | Limited | H/S, S demonstrated | **functional/bounded** named software samples; consult inventory below for exact codec variants. |
| SBC / DFPWM / RealAudio 14.4 / comfort noise | B, ? | No copy contract | F shared path, ? | F with source/packet corrections | Not tested | S demonstrated | **functional/bounded** corrected compatibility fixtures. SBC needs file extension or demuxer hint; malformed old RealAudio/timestamp fixtures remain failures. |

**Selective audio preparation within native:** optional FLAC decodes only selected
audio, preserves established 16/24-bit integer samples, sample rate and mono/stereo
layout, encodes FLAC and copies video. Explicit checks exercised PCM16/24 at
44.1/48 kHz. The guard admits rates up to 192 kHz, but those are not all tested.
Floating-point, true 32-bit precision, multichannel and changed decoded format
reject. Automatic lossless permission is narrower: local Matroska, H.264 ≤1080p,
selected PCM16/24 mono/stereo 48 kHz, known selected starts/ends within 50 ms and
compatible subtitles/features. Copy/direct stays preferred. Explicit Opus adaptation
is lossy, requires permission, copied H.264 plus PCM16/24 mono/stereo 48 kHz, and
has no Native ASS combination. Neither path makes AC-3/E-AC-3/DTS universally Native.
See [completion](OPTIMIZATION-COMPLETION.md) and [final evidence](../results/optimization-final/README.md).

## Containers / demuxing

Container handling is independent of the codecs inside. Native Direct may play a
container that Demuxe does not remux, and FFmpeg demuxing alone does not qualify
its streams. Sources: [selection](../src/internal/selection.ts),
[remux](../native/remux/remux.c), [broad routing](BROAD-ROUTING.md),
[software matrix](../results/format-matrix/README.md), [catalogue](HEAD-TO-HEAD-CATALOGUE.md).

| Container / operation | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MP4/MOV, front/tail moov; single-file fragmented MP4 | B | FFmpeg→MP4/WebM C | FFmpeg demux | FFmpeg demux | Limited | D → R → H → S | **functional/bounded** indexed/fragmented fixtures. Actual codecs, selected tracks and edit/timestamp support decide route; not all MOV codecs are browser codecs. |
| Matroska/MKV | B; real tested successes | FFmpeg→MP4/WebM C | FFmpeg/mpv demux | FFmpeg/mpv demux | Pass | D → R → H → S | **functional/bounded**; qualified embedded subtitle tracks can use the independent mpv subtitle service while browser A/V remains Native. AVC missing DTS repair needs explicit bounded reorder information; generic missing DTS is not guessed. |
| WebM | B | C compatible VP8/VP9/AV1 + Opus/Vorbis | FFmpeg demux | FFmpeg demux | Pass | D → R → H → S | **functional/bounded**; container label alone does not qualify high-depth/color or arbitrary codec pairs. |
| MPEG-TS files, AVC with optional AAC | B; rejected tested direct fixture | C with IDR/timestamp/ADTS handling | FFmpeg demux | FFmpeg demux | Pass | R → H → S on tested browser | **functional/bounded**; remux TS gate excludes other selected codecs. |
| MPEG-TS with MPEG-2, and MPEG-PS | B, no demonstrated route | No current TS contract for MPEG-2 | Demux exists; MPEG video has no bridge | FFmpeg demux/decode | Pass | S | **functional/bounded** Software; TS demux support is broader than Native TS preparation. |
| AVI, including MPEG-4 Part 2/MJPEG/lossless fixtures | B, ? | Only if selected streams meet C contracts; fixture-specific ? | Demux exists; video bridge still required | FFmpeg demux | Limited | S for tested legacy video; D/R/H conditional | **functional/bounded** Software; AVI does not independently mandate software video. |
| Ogg Opus/Vorbis; FLAC, MP3, WAV/M4A audio files | B | Supported selected compressed codecs only | FFmpeg demux/audio | FFmpeg demux/audio | Pass | D → eligible R → H/S | **functional/bounded** audio-only fixtures; PCM/ALAC do not acquire a remux contract from their container. |
| ASF, NUT, RealMedia, raw elementary audio/video | B, ? | Exact source/packet qualification required | FFmpeg where implemented; bridge still required | FFmpeg, tested variants | Not tested | S demonstrated; H where video eligible | **functional/bounded** selected software fixtures only; explicit hints for weak probes. |
| Arbitrary registered demuxers, nested formats or changing codec configuration | ? | Not blanket admitted | Not blanket admitted | Not blanket qualified | Not tested | No guaranteed fallback | **untested** unless separately evidenced; registration count is not capability coverage. Parameter changes/timeline violations can reject or require recovery. |

## Subtitles

Sources: [production caption routing](COMPONENT-ROUTING.md),
[plain VTT classifier](../src/internal/plain-vtt.ts),
[component study](HYBRID-COMPONENT-STUDY.md), [compatibility](COMPATIBILITY-EXPANSION.md),
[Native ASS implementation](../src/internal/native-ass.ts) and [catalogue](HEAD-TO-HEAD-CATALOGUE.md).

| Variant / handling | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plain external UTF-8 WebVTT via `addSubtitle(File)` | Browser cues | Browser cues with source-time bias | mpv renderer | mpv renderer | Pass | D → R → H → S | **functional/bounded** current production adapter; verifies cue count/text/timing and lifecycle. No cue IDs/settings/markup/entities/CSS/regions/maps. Not admitted with adapted audio or manifest timelines. |
| Browser URL text tracks via `addTextTrack()` | Browser tracks | Browser tracks | No replay of browser track contract | No replay of browser track contract | N/A | Eligible native only | **functional/bounded** API; browser/CORS dependent. Cannot silently discard these when moving to mpv. |
| Rich external WebVTT, SRT | No file adapter for rich VTT/SRT | No file adapter | mpv text/subtitle path | mpv text/subtitle path | Limited | H → S | **functional/bounded** external format/pixel checks; not every WebVTT styling feature. Strict external SRT→native-cue research is **experimental**, not current production admission. |
| External ASS/SSA, fonts, karaoke/vector styling | libass | libass | mpv/libass | mpv/libass | Limited | Qualified Native ASS plans → H → S in auto mode; `experimentalNativeASS: false` opts out | **functional/bounded**; matching renderer assets/isolation required. Explicit Native mode still requires `experimentalNativeASS: true`. Container fullscreen only; overlay does not follow video-only PiP/casting. |
| Embedded SRT/SubRip | mpv subtitle service with browser A/V | Same service with packet-copy A/V | mpv text/subtitle renderer | mpv renderer | Pass | D+mpv → R+mpv → H → S | **functional/bounded** local Matroska, one or two SubRip tracks; exact text/timing, selection and seeks checked. No SRT-specific production parser. |
| Embedded MP4 mov_text/tx3g | mpv subtitle service with browser A/V | Same service with packet-copy A/V | mpv renderer | mpv renderer | Pass | D+mpv → R+mpv → H → S | **functional/bounded** one MP4/MOV track; authored plain text/timing checked. General tx3g style fidelity remains unqualified. |
| Embedded ASS/SSA + Matroska fonts | mpv/libass subtitle service | Same service with packet-copy A/V | mpv/libass | mpv/libass | Pass | D+mpv → R+mpv → H → S | **functional/bounded** one Matroska track and marked styled fixture on Chrome; general attachments/font corpus, karaoke and vector fidelity need separate exact tests. Existing Hybrid evidence remains scoped to its fixtures. |
| VobSub/DVD bitmap | mpv bitmap subtitle service | Same service with packet-copy A/V | mpv bitmap composition | mpv bitmap implementation; current fixture passed bounded screen | Pass | D+mpv → R+mpv when A/V is Native; otherwise H → S | **functional/bounded** one Matroska track with verified marked bitmap and seek on an H.264/AAC derivative. The catalogue's H.264/AC-3 fixture still needs Hybrid for audio. General palettes/events remain unqualified. |
| PGS/Blu-ray bitmap | mpv bitmap subtitle service | Same service with packet-copy A/V | Three refreshed fixtures pass initial output, seeks and EOF | HEVC/AC-3 fixture passed; H.264/AAC derivative lost bitmap after seek | Limited | D+mpv → R+mpv when A/V is Native; otherwise H → S | **functional/bounded** the forced-software H.264/AAC derivative displayed its marked bitmap initially but lost it after seeking; see the [screen report](../results/head-to-head/demuxe-software-bitmap-isolation-20260923-01/REPORT.md). The separate HEVC/AC-3 catalogue fixture passed. Broader RLE/fragment/object/palette coverage remains unqualified. |
| TTF/OTF and embedded fonts | Optional ASS renderer | Optional ASS renderer | mpv/libass fonts | mpv/libass fonts | Not tested | Same subtitle route | **functional/bounded** supplied fonts/shaping. External file ≤8 MiB; ≤16 fonts/32 MiB aggregate; subtitle ≤8 MiB, ≤16/16 MiB aggregate. Over-budget/missing fonts do not imply fidelity. |

The Native + mpv service is automatic only for inspected, finite local Files with
qualified embedded tracks, native-compatible selected A/V, cross-origin isolation,
and no external browser text-track or file-attachment conflict. Automatic
admission first checks that both optional subtitle-engine assets are served;
an asset-omitting package retains the Hybrid/Software route. mpv track IDs
are matched to inspected stream indexes so `auto` honors the file's default
subtitle track. Before accepting a selected track, the service requires an
actual rendered overlay at the current time or at 0, 1, 2, 5, 10, 20 or 30
seconds. A track with no overlay at those samples uses
Hybrid/Software; the startup sample is a conservative admission check, not a
full-file fidelity proof. It uses one
subtitle service worker, its pinned mpv/FFmpeg decoder, a separate bounded local
random-access reader and a container overlay. mpv has `vid=no` and `aid=no` and
the render bridge rejects any nonzero mpv A/V chain count. The browser media
element remains the A/V clock and decode/presentation owner. Direct keeps the
original media URL; Remux uses existing packet-copy MSE only when required by
A/V or explicitly requested. This subtitle Remux plan uses the maintained
window-owned MSE scheduler, keeping its worker teardown bounded. No remote
source is admitted to the subtitle
service. Reads are at most 256 KiB each, with at most 8,192 uncached reads
per session and a 4 MiB subtitle slice cache;
the service Wasm heap is capped at 128 MiB and bitmap dimensions at 1920×1080.
Its bounded failures fall through to Hybrid/Software when compatibility can be
established; source identity and authorization failures remain terminal.
Missing optional subtitle-engine files are detected before route admission;
an asset that disappears after that check is a terminal deployment failure.
The public plan IDs are `native-direct-mpv` and `native-remux-mpv`;
the backend diagnostics identify `direct-mpv` or `remux-mpv` and expose
`mpvSubtitles.avChains`. Browser-owned URL text tracks remain browser-owned
because Demuxe does not possess their bytes. Standalone plain external WebVTT
and optional external ASS retain their existing API paths. Subtitle-only
overlays do not follow video-only PiP, remote playback or video-element-only
fullscreen.

## Video characteristics / pixel formats

Sources: [pixel/profile fixture metadata](../results/format-matrix/fixtures.json),
[configuration tests](../tests/video-codec-config.mjs),
[YUV presenter](SOFTWARE-YUV-PRESENTER.md), [compatibility](COMPATIBILITY-EXPANSION.md),
[retained decoder](../web/retained-decoder-worker.js) and [remux](../native/remux/remux.c).

| Characteristic | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SDR 8-bit 4:2:0 progressive | B | C | W retained frames | F→YUV when decoded frame qualifies; otherwise RGB | Pass | D → R → H → S | **functional/bounded** broadest decode evidence; [YUV admission](SOFTWARE-YUV-PRESENTER.md) additionally requires even full-frame source, zero rotation and resolved color metadata. |
| 10-bit 4:2:0 SDR decode | B | C, browser decode | W where accepted | F→RGB | Pass | D → R → H → S | **functional/bounded** named HEVC/VP9/AV1 paths above; RGB output is not 10-bit display precision qualification. |
| 4:2:2 10-bit, 4:4:4, packed RGB/raw formats | B, ? | C only for eligible video codecs | W only for supported configurations | F→RGB conversion | Limited | S demonstrated for named fixtures | **functional/bounded** ProRes/CineForm 422p10 and raw/r10k/r210/v210 samples; general chroma/alpha/color fidelity **untested**. |
| Interlaced AVC | B, ? | No: `frame_mbs_only_flag` gate | W platform-dependent, ? | F; deinterlace/filter contract separate | Not tested | S candidate; D/H only if verified | Remux **unsupported**; broad interlaced/deinterlacing quality **untested**. MPEG-2 playback is not a deinterlace oracle. |
| 4K input, bounded canvas output | B | C where eligible | Retained bridge permits ≤8192 each dimension and ≤33,554,432 pixels | Decode budget default 8,294,400 pixels | Not tested | D → R → H → S | **functional/bounded** short 4K Hybrid and Software checks; canvas output ≤1920×1080. Not sustained 4K/high-frame-rate qualification. |
| Odd dimensions / oversized configuration | B | Runtime contracts | Odd-size configuration supported; bounds reject | Decode/allocation bounds | Not tested | Eligible route only | **functional/bounded** configuration units; odd-size end-to-end set **untested**. Config description ≤64 KiB; separate engine/resource limits apply. |
| Rotation / display transform | B semantics | C metadata path, exact variant ? | Existing presenter semantics, variant ? | RGB fallback; YUV rejects nonzero rotation | Not tested | D if verified; S for exact filter request | Rotated output remains outside YUV admission; display-only research is not automatic filter routing. |
| Video-only and audio-only sources | B | C for selected supported streams | Video W or audio F; no video decoder needed for audio-only output | F selected streams | Pass | D → R → H/S | **functional/bounded** examples. Hybrid plan admission still requires available WebCodecs API; label alone does not prove video was active. |
| Alpha, stereoscopic/360°, arbitrary high frame rates | ? | ? | ? | ? | Not tested | No established choice | **untested** end-to-end semantics/fidelity; no claim from image/codec registration. |

Specialist codec claims above use the [36-second real-bitstream and library screens](../results/head-to-head/specialist-report-01/REPORT.md). They supplement the original synthetic catalogue; a failed combined-file lifecycle does not erase successful initial component decoding.

## Color / HDR

Sources: [tone-mapping implementation and checks](COMPATIBILITY-EXPANSION.md),
[YUV contract](SOFTWARE-YUV-PRESENTER.md), [HDR screen/fixture limits](HEAD-TO-HEAD-CATALOGUE.md).

| Color capability | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SDR BT.601/BT.709, full/limited range | Browser conversion | C metadata + browser conversion | Browser frame/canvas conversion | YUV shader for qualified frames, RGB otherwise | Limited | D → R → H → S | **qualified** YUV decoded-frame subset with explicit left/center chroma and BT.1886 transfer; no universal calibrated display claim. |
| PQ/HDR10 tagged HEVC Main10 / AV1 | B frame playback | C eligible packets, no HDR renderer guarantee | W frame playback | F decode/RGB; explicit tone-map option | Limited | D/R/H for playback only; S for requested SDR conversion | Playback **functional/bounded** screen; HDR luminance/gamut/mastering fidelity **untested**. |
| HLG tagged HEVC | B frame playback | C path | W path | F; explicit tone-map option | Limited | Eligible playback route; S for SDR conversion | Direct screen **functional/bounded**; HDR display fidelity **untested**. |
| Explicit PQ/HLG→SDR BT.709 | No Demuxe tone mapper | No Demuxe tone mapper | No: feature gate selects Software | zimg linearization/primaries + Mobius + limited-range BT.709 | Not tested | S | **functional/bounded** tagged reference comparisons; requires valid metadata, not all mastering peaks or displays. |
| Dolby Vision profile 5 / 8.1 | Browser-dependent | Missing HEVC parameter sets permits diagnosed fallback | Empty hvcC parameter-set arrays rejected before playback; repeated retained timestamps permit fallback | F; four auto-mode lifecycle screens passed, including JOC + ASS | Limited | S for the screened configurations | **functional/bounded** Software picture/audio/subtitle playback in the [gap follow-up](COMPARISON-GAP-CLOSEOUT.md). RPU application, Dolby Vision color and Atmos object fidelity remain **untested**. Profile 5 is not ordinary HDR10. |
| HDR10+ dynamic metadata / high-depth GPU output | ? | Packet transport not fidelity | ? | YUV shader does not cover HDR/high-depth | Not tested | No qualified fidelity route | **untested** dynamic metadata; experimental YUV high-depth/HDR conversion **unsupported**. |

## Audio layouts / output

Sources: [output owner](../src/internal/wasm-player.ts), [native PCM bridge](../native/ao_browser.c),
[compatibility channel checks](COMPATIBILITY-EXPANSION.md), [M2 acceptance](validation/M2.md).

| Output capability | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Default stereo output / mono source | Browser-controlled | Browser-controlled after decode | Float PCM worklet | Float PCM worklet | Limited | D → R → H → S | **functional/bounded**; Native does not expose discrete channel proof. mpv may resample to AudioContext rate. |
| Explicit `audioOutput: '5.1'`, `'7.1'`, `'auto'` | No: policy requires mpv | No: policy requires mpv | 6/8-channel ring/Web Audio | Same | Not tested | H → S | **functional/bounded** virtual graph per-channel checks; physical surround **untested**. `auto` selects advertised capacity; fallback stereo or explicit reject. |
| Encoded 5.1 input through default stereo output | B | C preserves encoded configuration | F output mix | F output mix | Limited | D → R → H → S | **functional/bounded** screen only, not 5.1 speaker layout or bit-perfect output. |
| Encoded AVR passthrough / Atmos object renderer | No Demuxe contract | No; compressed remux is not AVR passthrough | No | No | N/A | None | **unsupported** by declared output contract. |
| Source integer precision / lossless adapted audio | Browser output opaque | Optional FLAC sample preservation only | Float PCM output | Float PCM output | Not tested | Copy/direct preferred; adaptation only with gates | Adaptation sample comparisons **functional/bounded**, route **experimental**; physical bit-perfect device output **untested**. |
| A/V sync and output latency | Media-element clock | Same, source-time mapping | mpv queue + latency feedback | Same | Not tested | Preserve route's existing clock owner | **qualified** only for historical M2 measured profile; current broad physical A/V sync **untested**. Reported AudioContext latency is an estimate. |

## Streaming / source types

Sources: [current streaming architecture](STREAMING.md),
[selection guards](../src/internal/selection.ts),
[Shaka backend](../src/internal/shaka-backend.ts),
[source policy](../src/internal/shaka-network.ts), and
[limited FFmpeg fallback policy](../web/fallback-stream-policy.js).
`K` below means Shaka/MSE, an explicit Native execution plan. Shaka manages
manifests and MSE; the browser still determines which media it can decode.

| Source / streaming mode | Native Direct | Native Remux | Shaka/MSE | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Local File; small ArrayBuffer | Browser source | Bounded file reads | Not used | Bounded file reads | Bounded file reads | Not tested | D → R → H → S | **functional/bounded** unchanged file routes. ArrayBuffer ≤32 MiB; larger File uses bounded reads. Bare Blob is not a public input. |
| HTTP(S) random-access file | B if policy compatible | Range reader + FFmpeg | Not used | Range reader/mpv | Range reader/mpv | Pass | D → R → H → S | **functional/bounded** unchanged source contract: CORS, 206, stable size/identity, deadlines and cancellation. |
| Headers, credentials, authorization refresh, allowed origins | Excluded when browser cannot enforce policy | Controlled file reader | Shaka networking plugin | Controlled resource reader | Same | Not tested | Eligible controlled route | Streaming policy units plus real 401 refresh, terminal 403, cookie-preserving fallback and cancellation checks pass. Allowed origins are enforced before requests; redirects reject and range headers are preserved. |
| Plain HLS VOD, TS/fMP4, default selection | B if browser advertises HLS; actual output verified | No | Normal controlled backend | FFmpeg parses unchanged source | Same + software video | Pass | D if eligible → K → H → S | **functional/bounded** default HLS TS/fMP4/HEVC catalogue; controlled H.264 TS/fMP4 exact-package Chrome/Firefox checks. Controlled Shaka HEVC failed with a runtime VideoToolbox decode error despite Direct passing the same fixture; do not count that route as supported. See [fresh evidence](STREAMING-QUALIFICATION.md). |
| HLS rendition ceiling/pin or explicit tracks | Excluded when controlled selection needed | No | ABR ceiling, explicit variant and audio/text selection | No quality ceiling/pin support | Same | Not tested | K; reject if intent cannot be preserved | `maxBandwidth` constrains Shaka selection; `representation` pins an unambiguous exposed identity. Real low-bandwidth/high-pin and audio-switch checks pass; impossible pinned pairs reject. No legacy ordinal interpretation. |
| DASH fMP4, including H.264/AAC | No | No | Manifest, periods, segments and MSE | Narrow original-source fallback | Same | Pass | K → eligible H → S | **functional/bounded** H.264/AAC Shaka catalogue and Chrome/Firefox exact-package checks pass playback, pause and seeking. Former Hybrid pause failure is historical; no universal DASH claim. |
| DASH WebM, including AV1/Opus | No | No | Subject to Shaka/MSE/browser codec support | FFmpeg + WebCodecs if eligible | FFmpeg if eligible | Pass | K → H → S | **functional/bounded** AV1/Opus Shaka catalogue passes moving marked output, audio, pause, rate, seeks and EOF on tested Chrome. Other profiles remain conditional. |
| Multi-period DASH | No | No | Shaka period handling | Rejected: period semantics not preserved | Rejected | Not tested | K | Implementation delegated to Shaka; exact transitions, track changes and layouts require their own tests. No DASH→HLS rewriting remains. |
| HLS live sliding window (`live:true`) | Excluded by policy | No | Shaka refresh, buffering and DVR window | FFmpeg original-source timeline if eligible | Same | Limited | K → eligible H → S | **functional/bounded** Shaka sliding-window catalogue pass. `live:true` grants permission, not a claim that the source is live. Short tests do not establish indefinite-live or all DVR behavior. |
| Dynamic DASH (`live:true`) | No | No | Shaka timeline/window owner | Narrow FFmpeg fallback; seeking may be unsupported | Same | Not tested | K → eligible H → S | Exact dynamic-manifest profile requires runtime evidence. Unsupported controls must reject. |
| Manifest WebVTT / timestamp maps | Browser-dependent | No | Shaka text parser and text tracks | HLS subtitle renditions and DASH text tracks rejected | Same | Not tested | K | **functional/bounded** segmented WebVTT selection, active cues and visible caption toggling in the lifecycle fixture. Removed merged virtual subtitle resources; all timestamp-map/discontinuity cases are not qualified. |
| ABR, representation switching, DVR, discontinuities | Browser internal behavior only | No | Shaka owns execution | FFmpeg only within admitted fallback scope | Same | Not tested | K | Implemented by maintained backend; each behavior remains subject to scoped qualification. Old modernization experiments are not production dependencies. |
| LL-HLS, dynamic multi-period DASH, patching | No declared contract | No | Upstream capability is not Demuxe qualification | Rejected where unsupported | Same | Not tested | K only if admitted and verified | **untested** profiles; no universal capability claim. |
| Encrypted/DRM media | No declared contract | No | No Demuxe DRM/license contract | No | No | N/A | None | **unsupported** as a public Demuxe contract. Including Shaka does not introduce a DRM API. |

Shaka uses a lazy runtime asset and requires browser MSE/decoder support, not
Demuxe Wasm or cross-origin isolation. Its source plugin has response budgets
of 4 MiB per manifest and 16 MiB per other resource. Shaka owns scheduling,
retry parameters and bandwidth estimation; Demuxe enforces origin/auth/cancellation
policy. These are implementation budgets, not measured peak-memory claims.

The FFmpeg fallback transport retains 16 handles/16 MiB, a 1 MiB manifest and
8 MiB resource cap, and 10,000 opens for finite sessions. It does not rewrite
manifests, merge subtitles or select representations. Explicit quality constraints,
HLS subtitle renditions, multi-period/text DASH and unsupported extensions reject
instead of being silently dropped. Source and permission failures are terminal.
Prepared Native, Hybrid and Software require matching Wasm/worker assets.
Prepared Native, Hybrid and Software require cross-origin isolation. Native Direct and Shaka remain available without isolation where browser/source requirements are met. Deployment failure is not codec incompatibility. See [runtime requirements](NON-ISOLATED-REMUX.md).

## Processing and playback features

Sources: [plan admission](../src/internal/playback-plans.ts),
[public API](PUBLIC-API.md), [optimization completion](OPTIMIZATION-COMPLETION.md),
[unequal-tail evidence](../results/optimization-final/README.md),
[capability verification](../src/internal/runtime-capability.ts).

| Feature | Native Direct | Native Remux | Hybrid | Software | Software decode evidence | Preferred → fallback | Status and restrictions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pause/resume, volume/mute, rate 0.5–2×, seek | Media API | Source-time mapping/MSE | mpv | mpv | Pass | Current eligible route; diagnosed fallback | **functional/bounded** file fixtures; Shaka controls pass the [fresh lifecycle/catalogue checks](STREAMING-QUALIFICATION.md). Not gapless or universal exact-seek/pitch qualification. |
| Scalar `audioGain` attenuation, 0–1 | Web Audio stage | Same | Gain after PCM worklet | Same | Not tested | Keep current eligible route | **functional/bounded** digital signal/lifecycle checks; gain plan metadata experimental. No audio re-encode or full software-video requirement. |
| `volume=n` / `lavfi=[volume=n]` audio filter, 0–1 | No mpv filter | No | Explicit experimental admission | FFmpeg filter | Not tested | H if opted in → S | **experimental** Hybrid scalar-only contract; chains/expressions/resampling/latency-changing filters not admitted there. |
| Other audio filters | No | No | Not admitted by current planner | mpv/FFmpeg if available | Not tested | S | Software implementation; exact filter **untested** unless evidenced. Registered filters are not universal acceptance. |
| Exact CPU video filters; crop/flip/brightness examples | No | No | Current planner rejects | mpv/FFmpeg | Not tested | S | **functional/bounded** tested pixel transformations. Retained display-transform and copyback lab work does not change public routing. |
| Buffered Native seek reuse | Browser | Explicit experimental optimization | Existing mpv seek | Existing mpv seek | N/A | Preserve eligible route | **experimental** RAP/coverage/generation guards; not all buffered targets are safe. |
| Unequal selected audio/video tails, adapted Native | Browser-dependent original | Experimental FLAC windows | Existing mpv handling | Existing mpv handling | N/A | Original/copy first; admitted adaptation → H/S | Chrome adapted subset **functional/bounded**, Firefox Native long-tail **blocked**; distant Hybrid seek may recover to S. No synthetic padding. |
| Audio/subtitle track selection and source replacement | Browser identity limits | Selected source stream | mpv stream identity | mpv stream identity | Limited | First route preserving explicit intent | **functional/bounded** transactional replacement. Non-default audio without proven Direct identity excludes Direct; alternate audio not silently substituted. |
| Software RGB / qualified YUV GPU presentation | Browser compositor | Browser compositor | Retained-frame canvas | Decoded-frame YUV admission, RGB fallback | Limited | Same Software route | YUV uses WebGL2 only for the [bounded SDR 8-bit YUV420P contract](SOFTWARE-YUV-PRESENTER.md); diagnostics report the active presenter and RGB rejection reason. |
| Container fullscreen / video-only PiP or casting with overlay | Container fullscreen; overlay limits | Same | Canvas/overlay path | Canvas/render path | Not tested | Destination-compatible plan only | Native ASS container fullscreen **functional/bounded**; overlay PiP/casting **unsupported**. Broad destination qualification **untested**. |
| Automatic recovery, prepared vs verified state | Verified candidate | Verified candidate | Verified candidate | Terminal candidate | Not tested | Finite admitted plan order | **functional/bounded** contract/lifecycle evidence; no unrestricted combinations, silent subtitle loss or source-policy weakening. |

## Additional demonstrated software variants and evidence maintenance

The [software matrix](../results/format-matrix/README.md) and
[fixture metadata](../results/format-matrix/fixtures.json) retain exact generated
variants, including AMV, ASV1/2, Cinepak, CLJR, DV, FlashSV, JPEG2000/JPEG-LS,
MSRLE/MSVideo1, QTRLE, RPZA, SMC, Snow, SpeedHQ, SVQ1, and image/raw packet samples
(DPX, GIF, PNG, Targa, r10k/r210/v210 and packed rawvideo). Audio includes
ADPCM G.722/G.726/IMA QT/IMA WAV/MS/SWF/Yamaha, G.723.1, Nellymoser and the enumerated
PCM encodings. For each of these exact demonstrated software variants: Direct is
**B/?**, Remux has **no packet-copy contract**, Hybrid video has **no bridge**
(audio shares **F**, but variant-specific Hybrid checks are **untested**), Software
is **F, functional/bounded**, and the demonstrated preferred route is **S** with
no further fallback. This is not a still-image application/animation fidelity claim.

The original 115-sample matrix recorded 112 decode and 106 combined decode/seek/
cleanup passes; its failed rows remain evidence. The later
[compatibility expansion](COMPATIBILITY-EXPANSION.md) separately fixes/tests AV1,
SBC, DFPWM, intra Dirac/VC-2 admission, ADPCM SWF durations and MPEG seeking, and
corrects comfort-noise/RealAudio fixtures. Do not erase the old failures or report
registration counts as demonstrated formats.

When updating this reference, change the smallest component row, link the exact
implementation and result, and identify route, profile, output and browser scope.
Keep failures, asset/fixture blockers and lab status visible. A successful complete
file can establish its observed component behavior, but does not prove that
component on every other route. Keep the complete-file catalogue and its historical
artifacts intact; use [component routing](COMPONENT-ROUTING.md) and
[component study](HYBRID-COMPONENT-STUDY.md) for subsequent production/lab distinctions.

## Composition example: MKV with HEVC Main10 SDR + DTS core + embedded ASS

- **MKV**: FFmpeg/mpv can demux it; the container alone does not force Software.
- **HEVC Main10 SDR**: eligible WebCodecs configuration/frame delivery can retain
  browser video decoding; this says nothing about HDR display fidelity.
- **DTS core**: tested Native selected audio fails and Demuxe has no DTS packet-copy
  remux contract. Hybrid can decode it through FFmpeg while retaining WebCodecs video.
- **Embedded ASS**: production Native has no admitted extraction/rendering path;
  Hybrid uses mpv/libass. A lab extraction success does not remove this policy gate.

Therefore **Hybrid is the preferred eligible production plan**, subject to actual
startup/output and asset availability. If HEVC WebCodecs fails, **Software** is the
candidate fallback with FFmpeg video/audio and mpv/libass. Required HDR tone mapping
or an exact CPU video filter would independently select Software. HEVC+DTS and ASS
have component evidence; this reasoning is **not** a new claim that this exact
four-component file, every DTS layout, or physical A/V fidelity has been qualified.

## Buffering intent and control

Buffering is automatic (`balanced`, `preload: 'auto'`). The policy follows the
selected execution plan; no backend object is exposed to applications.

| Execution engine | `control` | `preload` | `profile` | `memoryBudget` |
| --- | --- | --- | --- | --- |
| Browser Native Direct | hint | true | false | false |
| Shaka | profile | true | true | false |
| Demuxe Native Remux | profile | true | true | true |
| mpv Hybrid / Software | profile | true | true | true |

`preload: true` means the intent is translated, not that zero network transfer is
guaranteed. Explicit open can require metadata, initial packets or a segment.
Byte budgets describe coded data only, never total runtime memory. Resolved
limits and exceptions are in `diagnostics.buffering`. Balanced mpv enables cache
with 32 MiB forward and 8 MiB backward packet budgets. Native retains browser
ownership; Shaka retains ABR, live windows, buffering and eviction ownership.
See [buffering contract](PUBLIC-API.md#automatic-buffering) and
[qualification and diagnostics](BUFFERING.md).
