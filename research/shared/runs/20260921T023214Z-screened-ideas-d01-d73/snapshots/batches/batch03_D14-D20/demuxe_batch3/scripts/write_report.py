"""Generate human-readable report from the executed evidence. SPDX-License-Identifier: MIT."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]; E=R/'evidence'
v=json.loads((E/'verification.json').read_text());o=v['observations'];env=json.loads((E/'environment.json').read_text())
report=f'''# Demuxe focused research — batch 3: D14–D20

**Executed component screens, not a production-player benchmark.**

Reviewed repository: `Jagalite/demuxe`, main at `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. The connected repository was read; no repository code was executed or modified, and nothing was pushed. These are temporary D-identities, not new canonical R-numbers. They extend existing research, rather than claiming seven wholly independent new inventions.

Environment: {env['chromium']}; {env['ffmpeg']}; {env['flac']}; {env['platform']}. Browser tests used Playwright, in-memory fixture bindings and headless Chromium. No network-streaming, hardware-decoding, physical audio output, CPU, energy, memory or production-integration result follows. WebCodecs `VideoDecoder` was unavailable in the non-secure test page; these are media-element/MSE and whole-file Web Audio decoder tests.

## Overview

| Question | What was executed | Disposition |
|---|---|---|
| D14 — Joint track declaration before first append | AVC MP4 + Vorbis WebM, early vs late audio-buffer declaration, four audio markers, wrong-offset control, seek/EOF | Pursue controlled split-track setup; exact tail/clock qualification still open. |
| D15 — Preserve Opus gain and trim as separate requirements | 0/+6/−6 dB Ogg → WebM/MP4, all coded packets, full browser PCM hashes and output lengths | WebM retained the tested whole-file output; the tested MP4 remux failed tail equivalence. |
| D16 — Constant/verbatim PCM-to-FLAC carrier | Real S16/S24/S32 formatter; independent FFmpeg/libFLAC checks; browser decode; S16 MSE A/V | Feasible, but do not adopt as a default: output can be much larger than ordinary FLAC. |
| D17 — Change only the audio codec while video continues | Opus → Vorbis in one audio SourceBuffer, same video SourceBuffer, live append, wrong-time control | Pursue component ownership; not gapless or sample-exact seam qualification. |
| D18 — Validate media separately from decoder acceptance | Three FLAC integrity negatives, browser decode, independent CRC parser, libFLAC test and trusted digest | Keep explicit validation; successful decoding is not an integrity certificate. |
| D19 — Choose the carrier for the actual numerical contract | S16/S24/S32 float checks; guarded S16 → S24 wasted-bit metadata transformation | Restricted byte-level lift works; Float32 does not retain arbitrary S32 integer precision. |
| D20 — Preserve declared color semantics across native paths | Same AVC samples through direct/MSE; untagged, explicit 601 and explicit 709 controls | Pursue known-color propagation; never guess a missing source color space. |

The verification harness recorded **{v['passed']} passing cross-checks and {v['failed']} unexpected check failures**. Expected route failures and fidelity negatives are passing *checks of an observation*, not successful playback routes. D16/D18/D19 reuse FLAC fixtures, and the tagged D14/D17 variants reuse D20's color controls. Do not count these as separate format-coverage wins.

## D14 — Jointly declare selected tracks before beginning native playback

**Question.** Can a route that appears unsupported actually be failing because the player initializes one track before declaring the other? Adjacent work: R032 mixed-container lanes, R028 complete-plan feasibility, and D07/D11 composition.

An authored four-second source carries AVC video plus independently marked stereo Vorbis audio. The video was also supplied as fragmented MP4, and the exact same Vorbis packet sequence as WebM. One MediaSource and one media element owned the separate video/audio SourceBuffers.

Declaring the Vorbis buffer only after appending video failed with `QuotaExceededError`, even though both MIME probes were true. Declaring both buffers first, then appending the same media, played, executed two seeks and reached EOF. A combined AVC/Vorbis MP4 MIME query was unsupported. This is a setup-order result in this browser, not a measurement of exhausted memory or a rule that all implementations behave identically.

Four audio bursts authored at 0.5, 1.5, 2.5 and 3.5 seconds appeared within **{o['D14']['max_marker_start_error_s']*1000:.1f} ms** of those positions at the test's audio-graph/media-clock witness. The deliberately wrong 400 ms audio offset produced a **{o['D14']['wrong_offset_max_error_s']*1000:.1f} ms** maximum marker-start error and failed the same 100 ms coarse gate. This is not sample-accurate synchronization: ScriptProcessor scheduling, its capture block and the media clock are part of the observation. Physical speakers were not tested.

The original full local Matroska source also played through native-direct. Therefore this is useful for a *controlled split-track consumer*, not grounds to replace working direct playback. The split presentation reported **4.025 s**, not an exactly four-second tail. Whole-file Vorbis decoding also differed by representation (Ogg 192,576 frames; WebM 192,000), so neither representation should be promoted to a universal oracle. The authored source markers establish the coarse timing test; full priming/trim remains open.

**Next gate:** current Demuxe admission sequencing, declared track selection, source replacement/cancellation, independent sample-level A/V capture, and exact end semantics. Do not retry a late-add quota exception indefinitely or globally blacklist the codec because of that one failed graph state.

## D15 — A remux must retain both gain and end trimming

**Question.** Does selecting a browser-supported container retain the Opus presentation semantics, not just the coded audio? Adjacent work: R095, R094, R320 and D13.

Three authored Opus sources use identical **108 coded packets** and header gains of 0, +6 and −6 dB. Header checksums were updated. Each was stream-copied to WebM and fragmented MP4. Ogg/WebM/MP4 retained the same ordered coded-packet hashes; this does not assert identical container timestamps.

For each gain, Ogg and WebM produced identical whole-file browser Float32 output and exactly **102,576 stereo sample frames**. The measured gain ratios were **{o['D15']['plus']['gain_ratio']:.6f}** and **{o['D15']['minus']['gain_ratio']:.6f}**, within the 0.1% check of the requested factors. The zero-gain variant served as a deliberately wrong output for the nonzero-gain contract.

The tested MP4 remux retained the tested interior PCM and gain but returned **103,368 frames**, adding **792 frames = 16.5 ms**. Thus it fails complete presentation equivalence despite preserving every coded packet. This is a finding about these authored files, this muxer recipe and browser path—not a universal defect of MP4 Opus.

**Decision:** a route selector should consider gain and trim separately from codec support. The WebM result is whole-file decode evidence, not full streaming-MSE PCM or seek qualification. Next test actual output through streaming seeks and EOF, investigate the MP4 tail metadata, and keep the source's requested gain exactly once.

## D16 — A true simple FLAC carrier: feasible, not automatically cheaper

**Question.** Can a small formatter replace general FLAC encoding when software-decoded integer PCM must be handed to a browser audio destination? Adjacent work: R102 and R243. R102 explicitly still needed a real formatter and like-for-like output-cost controls at the reviewed commit.

The prototype writes actual fixed-block FLAC headers, CRC-8/CRC-16, STREAMINFO and constant/verbatim subframes. It covers 48 kHz S16 stereo, S24 six-channel and S32 stereo fixtures, 192,000 sample frames each. It does not use FFmpeg to encode its candidate audio. FFmpeg only muxes the S16 FLAC packets alongside video for the A/V destination screen.

All candidate and conventional level-0/level-5 outputs reproduced the original integer PCM through independent FFmpeg decoding and passed libFLAC's integrity test. Each candidate's browser output also matched the corresponding conventional-encoder browser output. The S24 browser comparison was exact against all **1,152,000** authored normalized sample values. S16's separate float-conversion issue belongs to D19, not a failed FLAC bitstream. The S16 candidate played with video through MSE and seeks/EOF.

However, the output-size tradeoff is material:

| Authored profile | All-verbatim bytes | Constant-aware bytes | Conventional level-0 bytes | Constant-aware / level 0 |
|---|---:|---:|---:|---:|
| S16 stereo, half-duration silence | 770,358 | 389,802 | 111,536 | 3.49× |
| S24 six-channel ramps, half-duration silence | 3,459,110 | 1,746,608 | 152,534 | 11.45× |
| S32 stereo low-order variation | 1,538,358 | 1,538,358 | 178,252 | 8.63× |

These are intentionally simple synthetic signals, not a representative compression corpus. Constant-aware output approximately halves the all-verbatim size on the first two fixtures, but conventional FLAC remains substantially smaller. The input PCM was fully materialized and scanned: **no zero-allocation silence propagation was demonstrated**. A simple Python implementation is not a meaningful production speed comparison.

**Decision:** do not adopt this unconditionally. A future candidate must beat the maintained encoder on complete cost—formatting, copies, delivery bytes, browser decode, startup and retention. It does not eliminate decoding of an otherwise unsupported source codec.

## D17 — Keep video ownership stable through an audio codec change

**Question.** Can an audio-specific format change stay audio-specific? Adjacent work: R032 and the track-change/continuity family. This is not R116's software island orchestration.

The presentation has four seconds of AVC video, a two-second Opus audio section and a two-second Vorbis section with distinguishable left/right frequency identities. After playback began, the prototype called `changeType` on the audio SourceBuffer and appended the second section at its declared future position. The media element and video SourceBuffer were retained; video was appended once and was not replaced by application code.

The operation occurred around **{o['D17']['switch:0']['switch_call_time']:.3f} s** of playback. The second audio identity appeared at the graph witness around **{o['D17']['switch:0']['first_new_codec_marker_s']:.3f} s**, near the requested 2 s boundary. Both segment identities, two seeks and EOF were observed. An intentional 300 ms early audio offset moved the boundary witness to **{o['D17']['switch:-0.3']['first_new_codec_marker_s']:.3f} s**, failing the same 100 ms coarse window.

The explicit-color version matched **{o['D20']['switch_tagged:0']['compared_ordinals']}** observed picture ordinals against the tagged direct reference. This verifies the observed video pictures and JavaScript object ownership, **not the identity or lifetime of the browser's internal decoder sessions**.

The presentation ended at **4.021 s**. The 21 ms tail and unqualified overlap/priming behavior prevent a gapless or exact-seam claim. No software-to-native handback, damaged media recovery, long-running playback or playback-rate changes were tested.

**Next gate:** exact seam PCM, overlap/gap handling, source epoch checks, mid-append failure and cancellation. Test in the maintained player without recreating the healthy video path as a fallback shortcut.

## D18 — A decoding success is not an integrity verdict

**Question.** Can Demuxe leave decode browser-owned while retaining an explicit integrity contract? Adjacent work: R311, R192/R222 and D05/D12.

The controls were: a frame-CRC-only change; an incorrect STREAMINFO MD5; and a changed PCM sample with a recomputed valid frame CRC but the original, now-invalid MD5.

| Control | Browser whole-file decoder | Scoped frame-CRC guard | Independent libFLAC integrity test | Trusted expected source SHA-256 |
|---|---|---|---|---|
| Valid source | Accepted | Accepted | Accepted | Matched |
| Wrong frame CRC | Accepted, same PCM | Rejected | Rejected | Rejected |
| Wrong stream MD5 | Accepted, same PCM | Accepted | Rejected | Rejected |
| Changed sample, valid frame CRC | Accepted, changed PCM | Accepted | Rejected | Rejected |

The independent framing/CRC parser reads the constructed constant/verbatim profile; it does not expand PCM. It is not a generic FLAC validator and a CRC is not authentication. The trusted digest in the test belongs to the known authored reference, not an arbitrary digest supplied alongside untrusted input.

**Decision:** keep decoder admission separate from structural validity and trusted content identity. Do not describe this browser behavior as a security vulnerability or assume it applies to every decoder. Production verification cost and streaming resource bounds were not measured.

## D19 — Match the numerical contract without expanding the samples

**Question.** Can a different lossless representation preserve a required Float32 convention while avoiding a larger per-sample carrier? Adjacent work: R174 and R010. This is a new restricted subcase, not a general FLAC predictor transformation.

The explicit oracle normalizes S16 by 2^15. The browser's S16 FLAC result differed from that oracle in **95,996 of 384,000 scalar samples**, with maximum absolute difference **8.37445×10⁻⁶**. Both the candidate formatter and conventional FLAC controls showed the same behavior, so changing encoders did not fix it. This is a small numerical-convention difference, not an asserted audible defect.

An explicit S16-to-S24 lift (sample values multiplied by 256) produced the required normalized Float32 output exactly, but a naive wider carrier grew to **583,524 bytes**. A second prototype instead promotes the stream's declared bit depth and adds **eight wasted bits per subframe**, retaining the original 16-bit constant/verbatim sample payload bytes.

That byte-level transform copied **387,444 sample-payload bytes** across **188 frames** without PCM expansion. The complete file grew only **376 bytes**, from **389,802 to 390,178 bytes**. Independent host decoding recovered the correct shifted integers, and browser decoding matched all **384,000** requested float values exactly. Already-24-bit, invalid-frame-CRC and truncated-input controls were rejected.

Changing the integer representation changes its PCM MD5. The prototype deliberately marks output STREAMINFO MD5 **unknown (zero)** rather than copying a false digest. Full output correctness was established separately by the independent decode oracle. A production contract requiring a verified output MD5 needs a valid new digest; it must not mistake the unknown field for verified integrity. Input content identity is also separate from frame CRC validity.

A separate S32 control demonstrates the hard boundary: the browser result matched correctly rounded Float32, yet **380,977 of 384,000** original integer values were no longer exactly recoverable; maximum integer error was **64**. This is expected representational loss at a Float32 boundary, not faulty FLAC decoding.

**Decision:** pursue the compact restricted lift only for an explicit numerical contract. Do not silently change ordinary playback semantics or route exact S32 export/analysis through a Float32-only boundary. General LPC/fixed-predictor promotion, existing wasted bits, new channel layouts and arbitrary bit depths remain unqualified.

## D20 — Eliminate disagreement in color interpretation, not coded pictures

**Question.** Can native-route changes alter output solely through missing color signaling? Adjacent work: R008/R242 metadata, R099/R193 fidelity, and D13 output witnesses.

The same untagged AVC file, with the same coded packets and matched presentation timestamps, rendered different RGBA values through native-direct and MSE. A strict paused-frame comparison at 0.48, 1.48 and 2.48 seconds found **22,838 / 23,497 / 23,304 differing components**, with a maximum 8-bit component difference of **40**. This was not accepted as a successful same-picture oracle.

Two independently declared source profiles were then authored: explicit limited-range 601-family color signaling, and explicit limited-range 709 signaling, in both AVC configuration and container metadata. **All 100 video packet hashes and all 100 host-decoded YUV pictures remained unchanged.** Direct and MSE RGBA matched exactly at all three checked timestamps for each explicit profile.

The untagged direct output matched the explicit-601 control and the untagged MSE output matched the explicit-709 control at those frames. This is evidence consistent with different defaults on this browser/profile, not a universal rule for every browser or an authoritative inference of the untagged source's intended color space. The intentionally different declared-matrix control also produced different RGB, proving that packet hashes alone cannot settle presentation fidelity.

Combining the explicit-601 source with D14 and D17 matched **{o['D20']['split_tagged:0']['compared_ordinals']} and {o['D20']['switch_tagged:0']['compared_ordinals']}** observed picture ordinals, respectively, against the tagged direct reference. Timing, audio tails and hardware/display fidelity remain separate gates.

**Decision:** propagate genuinely known color semantics to every destination that needs them. For missing or conflicting signaling, preserve ambiguity or require an explicit policy; never force 709 just because it makes a test agree. Next test container/SPS disagreement, source replacement, range, primaries/transfer combinations, HDR and cross-browser display behavior.

## Evidence and reproduction

See `evidence/verification.json` for computed observations and every cross-check; `browser_audio.json`, `browser_routes.json`, `browser_reference.json`, `pixel_diagnostic.json` and `promotion.json` for raw browser/component records; `build_commands.json` and `verification_commands.json` for executed host commands; and `fixtures/` for the authored media. Browser snapshots pin fixture hashes. `checksums.sha256` covers delivered files.

`bash run_all.sh` archives current evidence/fixtures before creating a new run. Runtime observations such as callback counts and marker timings can vary; the script must retain unexpected failures rather than rerunning until they disappear. The 100 ms marker gate is a declared coarse verification tolerance, not a predeclared performance target. No performance gate was run.

### Retained early findings and harness corrections

- The initial harness appended video before creating audio. Its failure was retained and turned into D14's explicit negative control; it was not called an unsupported-codec result.
- An initial FFmpeg conventional S32 FLAC control encoded at a smaller effective precision. That invalid like-for-like baseline and its results are retained under `evidence/initial/first_screen/`. Final conventional controls use libFLAC at the declared source bit depth and pass independent original-integer-PCM comparisons. No comparison relies on the invalid baseline.
- The first cross-route RGBA mismatches were retained, investigated as D20 and resolved only for explicitly declared color controls. The untagged mismatch remains a recorded negative.
- Some early orchestration calls were interrupted by the tool time limit. Final records reran bounded groups against frozen fixtures. None of this is asynchronous delivery or a remote application benchmark.

## Sources and related records

These sources define the mechanisms and reviewed scope; they are not external confirmation of this batch's new measurements.

- Reviewed commit: https://github.com/Jagalite/demuxe/tree/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1
- R032: `research/items/R032.use-different-output-containers-for-different-tracks/README.md`
- R095: `research/items/R095.fixed-opus-gain-through-codec-container-headers/README.md`
- R102: `research/items/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier/README.md`
- W3C Media Source Extensions, addSourceBuffer / changeType / initialization: https://www.w3.org/TR/media-source-2/
- W3C WebM byte-stream format: https://www.w3.org/TR/mse-byte-stream-format-webm/
- RFC 7845, Opus header gain and trimming: https://www.rfc-editor.org/rfc/rfc7845.html
- RFC 9639, FLAC STREAMINFO, wasted bits, constant/verbatim subframes and checksums: https://www.rfc-editor.org/rfc/rfc9639.html
- W3C Web Audio, Float32 AudioBuffer representation: https://www.w3.org/TR/webaudio/
- FFmpeg H.264 metadata bitstream filter: https://ffmpeg.org/ffmpeg-bitstream-filters.html#h264_005fmetadata
'''
(R/'REPORT.md').write_text(report)
