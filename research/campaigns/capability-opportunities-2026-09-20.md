<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Capability gaps against completed research — 2026-09-20

This is a source/evidence review and proposed work queue, not a new experiment,
an amendment to canonical decisions, or production admission. Reviewed the current
[capability reference](../../docs/CAPABILITIES.md), all 425 canonical item identities
and dispositions, the [148-item whole-player assessment](whole-player-tier-classification.md),
and the subsequent [component study](../../docs/HYBRID-COMPONENT-STUDY.md).
The review used the working tree; some component-study files remain uncommitted.
No media tests or production changes were performed for this review.

Current catalogue dispositions: 141 pursue, 211 stop_current_profile, 32 inconclusive,
27 permanently closed missing sources, 14 already_implemented. These counts describe
research decisions, not 141 production-ready improvements. The whole-player campaign
has three qualified scoped benefits, five benefit-gate failures, two fidelity failures
and one deferred integration audit among its eleven prioritized candidates.

The capabilities table cannot supply a count of improved complete-file formats.
Codec, container, audio, subtitle, source policy and output requirements intersect.
Priorities below reflect demonstrated blockers, reusable implementation and evidence
strength; actual user-media prevalence has not been measured.

## Recommended next work

| Order | Workstream | Relevant formats / improvement | Existing evidence | Smallest useful next step |
| --- | --- | --- | --- | --- |
| 1 | Production subtitle ownership: R041/R019, plus plain MP4 mov_text and external ASS | Compatible Native A/V currently forced to Hybrid by subtitle ownership. Covers embedded SRT, plain tx3g, embedded ASS and external ASS through distinct handlers. | Five-pair R041/R019 results: 49.84% / 38.47% lower steady Chrome CPU. Separate three-pair study: H.264/AAC/MP4 mov_text 48.7% lower CPU; H.264/PCM24/MKV external ASS 35.7% lower CPU. These are separate workloads, not additive savings. | Reuse existing browser text tracks and optional libass. External plain SRT and external ASS avoid embedded extraction and can be bounded first integrations. For embedded tracks replace the 32 MiB whole-file lab extractor with bounded range-based preparation; qualify selection, cancellation, stale source work, fonts/styles and actual maintained-player cost. Keep unsupported semantics on existing routes. |
| 2 | Finite Native DASH scheduling | Static single-period AV1/Opus WebM; H.264/AAC fMP4 as a separate correctness target. Potential Hybrid to Native transition. | Three-pair complete-prefetch AV1/Opus trial: 55.7% lower Chrome CPU. H.264 candidate passed bounded checks, but Hybrid baseline pause failed, so no paired H.264 saving. | Build a bounded segment scheduler for one static AV1/Opus profile, charging acquisition/startup/memory and testing seeks, segment failure, source identity, cancellation and credentials. Repair the H.264 baseline pause failure separately. No live/ABR/multiperiod inference. |
| 3 | R007 HEVC/AAC MPEG-TS preparation | Removes the AVC-only TS remux restriction for a stable HEVC/AAC profile. Potential Hybrid to Native Remux transition. | Isolated candidate passed full host pictures/PCM, actual browser playback/seek, configuration-change/backward-timestamp rejection and cleanup. No whole-player performance result. | Connect the bounded candidate to maintained Player; establish actual baseline route, retain AVC regression and output controls, then compare complete startup/steady/seek costs. |
| 4 | R086 real decoded audio alongside browser media-element video | Six observed audio-blocked combinations: H.264 or HEVC Main10 SDR with AC-3, E-AC-3 or DTS. Potentially avoids the current Hybrid video/presentation path while retaining software audio. | Generated-PCM clock controller only: median p95 digital-clock error 27.77 to 14.01 ms. No actual AC-3/E-AC-3/DTS player integration or CPU benefit proved. | One H.264 + AC-3 stereo fixture using the ordinary decoder first. Prove selected audio/pictures, clock behavior, rate/pitch, seek, starvation, replacement and cleanup before CPU measurement. Do not label this Native A/V: it introduces an independent PCM owner. Expand codecs/layouts only after the first route earns its cost. |
| 5 | Correctness repairs: existing Hybrid PGS and experimental color presentation | PGS required-marker failure is a playback defect. R024 YUV and R008 display-transform routes are blocked by colored-output fidelity. | PGS marker failure is recorded. R198 strict PGS compositing also failed a separate exact alpha/color oracle. R024 gray passes but colored edges fail; R008 unrotated control also reproduces edge differences. | Diagnose the existing PGS failure independently of a new Native overlay. Separately isolate decoder/chroma/range/matrix/interpolation/presentation differences for R024/R008; similar symptoms do not establish one shared cause. Benchmark only after the original output gates pass. |
| 6, deployment-dependent | R006/R176 nonisolated JSPI remux — Dropped / intentionally removed | Historical deployment compatibility benefit. | Additional runtime, invocation, packaging and qualification complexity outweighs present production value; pthread remains maintained. | Revisit only if concrete deployment demand appears. |

The finite DASH and plain tx3g work are component-study findings, not newly assigned
canonical R-numbers. Register their exact definitions and ownership if work proceeds;
do not relabel R088/R363 Native HLS as DASH or claim tx3g is already within R041's
simple SubRip contract.

Primary positive measurements: [component report](../../results/head-to-head/component-isolation-report-01/REPORT.md)
and [whole-player results](whole-player-tier-classification.md). The three-pair study
uses bounded synthetic Chrome/macOS fixtures; it is additional actual-player evidence,
not the later five-pair qualification. Browser CPU excludes server and external OS
media-service CPU; summed RSS can double-count shared pages. No energy or universal
codec savings follow. ASS also increases renderer main-thread work in the qualified
R019 workload.

## Conditional projects after the immediate queue

| Candidate | When to work on it | Evidence and boundary |
| --- | --- | --- |
| R022 Document PiP for independent ASS | ASS subtitles and controls must survive PiP. | Actual custom-shell document transfer passed; maintained observer/listener rebinding remains. This does not repair video-only PiP/casting or claim ordinary CPU gains. |
| R051 ALAC16 to FLAC with copied H.264 | Representative files are blocked by ALAC audio. | Exact 96,000 stereo frames and 48 coded video packets, Native seek/EOF passed. Actual-player cost and bounded streaming integration remain; no TrueHD/general 24-bit inference. |
| R057 six-channel FLAC + R061 native channel graph | Explicit surround output is important. | Six-channel sample identity and static channel operations passed; graph added about 5.2% component cost. Real A/V integration and physical speaker routing remain, not just removing a policy guard. |
| R013 explicitly disabled tracks | Users actually request video-only playback of incompatible-audio files. | Real disabled-audio preparation avoids decoding/encoding audio. Mute is not disable; re-enable semantics and actual-player benefit need qualification. |
| R005 worker-owned MSE | Traces show UI work blocks paced appends. | Eleven component pairs save about 1.02 s under deliberately heavy UI load. Unpaced work pays worker startup; no general steady-playback gain. |
| R321 relative Matroska Cue seeking | Real remote files have large Clusters and trustworthy relative Cues. | Bounded route saved 82.36% target-job time / 93.73% wire bytes; prebuilt index preparation excluded. Integrate real demux/range/A/V ownership and charge complete costs before player claims. Distinct from the other R321 IIR checkpoint item. |
| R059 selected-track MP4 metadata view | Alternate selected tracks force unnecessary preparation. | Host jobs saved 30.76%; maintained player/transport benefit unmeasured. Unselected mdat bytes remain; this is not a redacted export. |
| R335 presenter recovery | Actual GPU/context loss causes disruptive reopen. | Synthetic component recovery preserved output and reduced recovery cost. Real driver loss and maintained player ownership remain; reliability project, not steady CPU saving. |
| R358 strict Matroska zlib unwrapping | Target files actually use this narrow compression profile. | Correctness and hostile-input controls passed with about 49.1 ms added validation cost. Capability, not a speedup; finite/unlaced/single-zlib constraints remain. |
| R055/R073 preview caching/batching | An actual scrub-preview service has repeated/pending requests. | Workload-specific gains; one-way traversal can lose. No continuous playback benefit and no reason to delay requests to fill a batch. |

R274 remains useful for its exact missing-index WebM/server-assisted workload, but
its narrow video-only profile does not outrank the subtitle/DASH opportunities on
demonstrated scope alone. Large-file/A/V/general-WebM expansion needs fresh evidence.

## Capability areas that do not imply a ready optimization

- General legacy/software codecs, unusual chroma/depth and high frame rates: no
  universal fast path follows from decoder registration. R145's specialized Wasm
  decoder had no trustworthy cost gain. Avoid broad decoder porting without an
  actual workload and opportunity measurement.
- HDR/Dolby Vision: R099 preserves an explicitly requested profile-8.1 HDR10 base
  at the host bitstream level; it does not qualify native HDR display or Dolby
  rendering. Profile 5 is excluded. HDR10+, physical gamut/luminance and high-depth
  fidelity remain separate projects requiring suitable reference/output evidence.
- DTS-HD/TrueHD multichannel, Atmos and AVR passthrough: fixture limitations,
  ordinary audio decoding and absent object/bitstream output contracts are different
  gaps. None is automatically repaired by FLAC, R086 or native subtitles.
- HTTP credentials, authorization refresh, source identity and origin constraints
  legitimately exclude some Direct routes. Preserve these requirements in every
  new route; source-policy bypass is not a performance improvement.
- DRM, LL-HLS, ABR/DVR, live/multiperiod expansion and arbitrary codec changes need
  explicit feature work. Finite DASH proof does not qualify them. Current Native
  live HLS candidate failed rate progression.

## Keep the negative decisions

Do not resume unchanged R003 range coalescing, R023 fused effects, R026 paused
scheduling, R048 cue windows or R049 lookahead: actual-player benefit gates failed.
R008/R024 need fidelity repair before reopening timing. R011 quantized FLAC failed
complete bridge cost; R012 lossy Opus/MP4 failed terminal sample counts; R029 DTS-core
extraction still met an unsupported Chrome destination. R123 decoder checkpoints
require substantial internal state integration without a demonstrated representative
whole-player payoff. A materially changed workload or repaired cause can justify
reopening, but a remaining capability-table gap alone does not erase those results.

Canonical item records remain under [research/items](../items); reused numerical
IDs are distinct mechanisms. This review changes no item disposition or historical
artifact and proposes no automatic admission changes.
