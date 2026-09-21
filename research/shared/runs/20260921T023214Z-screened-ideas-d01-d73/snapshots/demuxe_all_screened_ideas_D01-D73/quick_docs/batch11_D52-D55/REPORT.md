<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research, batch 11 — D52–D55

## Summary

Four standalone, executed screens. They are not four new codecs, four independent discoveries, or four production passes. D52 advances a different consumer of declared silence; D53 is explicitly a regression for an existing policy; D54 adds edited-timeline semantics to native captions; D55 qualifies a bounded native effect and retains a reproducible channel-tail negative.

The important distinctions are **silence versus missing data**, **a requested removal interval versus the actual remaining buffer**, **source cue times versus presentation cue times**, and **a source ending versus its filter output ending**.

Repository reference: `Jagalite/demuxe`, commit `0060c26c23290d20041f8433452e2eb088b31f59`, read through the connected GitHub tool. This is a lineage review, not a checkout/build/test of Demuxe. No repository changes were made. Python 3.13.5, NumPy 2.3.5, Chromium 144.0.7559.96, FFmpeg 7.1.5 on Linux; exact runtime manifest is in `evidence/environment.json`.

No CPU/energy benchmark, hardware-decoder proof, process-memory measurement, continuous A/V sample oracle, real network measurement, or release qualification was performed. Native means browser-owned APIs in the tested environment, not necessarily hardware accelerated. The browser's `about:blank`/Blob environment is used, without network playback or WebCodecs.

| Item | Scoped decision | Important retained limitation |
|---|---|---|
| D52 | Pursue upfront declared-silence fragments; late seamless repair fails | Late insertion restores video/EOF but not subsequent audio timing; an explicit seek fixes coarse output but changes the playback trajectory |
| D53 | Regression coverage, not a new eviction policy | A 0.1 ms cutoff overrun discards two more seconds of dependent video; no allocation/CPU benefit measured |
| D54 | Pursue plain-text cue projection for an explicit edit map | Does not qualify ASS, karaoke, layout fidelity against another subtitle engine, speed changes, or production ownership |
| D55 | Pursue fixed-channel bounded FIR rendering under the declared tolerance | General outputs are not bit-exact; default channel behavior produces a real tail error in this browser |

## D52 — Preserve explicit silent time with constant FLAC frames

### Question and contract

Can a source-declared silent span be represented in a browser-owned audio lane without creating a full application PCM span, while preserving the video timeline? This is not automatic silence detection and not replacement of lost network data with zeros.

The fixture has one second of two distinguishable S16/48 kHz tones, two seconds of explicitly declared stereo silence, and one second of different tones. The variable-block FLAC writer constructs the two silent frames directly: one constant value per independent channel, sample count, sample number, and frame/header checksums. It does not allocate or iterate 48,000 PCM samples in either silent-frame call. The independent oracle deliberately does materialize the expected PCM; that is test cost, not an avoided process-wide allocation.

The frame formatter is bounded to this authored two-channel, 16-bit profile. STREAMINFO's PCM MD5 is explicitly unknown, not a false digest. The 48,000-sample blocks are accepted in this tested general FLAC destination; no universal streamable-subset or decoder compatibility claim is made.

### Executed results

* Two one-second silent coded frames occupy **18 and 19 bytes**, **37 bytes total**.
* Fragment wrapping adds overhead: the two self-contained media fragments occupy **126 and 127 bytes**, **253 bytes total**. Initialization is separate and already supplied.
* Host FFmpeg decoding of both the candidate and the deliberately verbatim reference reproduced **384,000 individual integer channel samples** exactly.
* Browser whole-file decoding returned **192,000 stereo frames** for both representations, with identical per-channel Float32 hashes and exactly zero samples in the intended silent interval.
* The entire candidate file is **384,367 bytes** versus **768,359 bytes** for the deliberately dense counterpart. This is not a comparison with an optimized general FLAC encoder. Tone payloads were intentionally held constant between arms.
* Supplying all fragments before playback produced continuous `[0,4]` audio/video ranges, natural-speed playback to exactly four seconds, both early and late channel tones in their coarse capture windows, zero central-interval output, and four correct video seek witnesses.

### Missing data was not silence

When both silent fragments were withheld, the audio lane exposed `[0,1]` and `[3,4]`, despite a continuous video lane. MSE's combined range retained the hole and natural-speed playback stalled at **one second**. Calling `endOfStream()` did not fill the internal hole.

Adding the 253 bytes afterward repaired the reported range to `[0,4]`, restored video playback, and reached EOF without replacing the video SourceBuffer. However, the later tone was absent from its expected time window. A repeated late-insertion run and a run withholding the early `endOfStream()` signal also failed subsequent audio timing. Some late-insertion captures observed the later tone too early, rather than no tone anywhere; the evidence supports a timing/presentation failure, not a blanket claim that the codec stopped producing samples.

An explicit post-repair seek to **1.04 seconds** restored the expected coarse quiet interval and late tones. That seek deliberately skips 40 ms of the declared silent region. It is **not** a sample-exact, seamless repair or continuous A/V synchronization result.

The trusted-silence constructor rejects an unknown gap, a stale source epoch, and a reversed interval. These are component guards, not production transport authentication or cancellation tests.

### Decision and lineage

Pursue the **upfront** constructor for a real editor/source that supplies authoritative silent intervals. Keep late seamless repair failed until maintained playback and full audio timing are qualified. If no such source exists, do not add a blanket gap filler.

R243 stopped a post-filter PCM scan/descriptor/materialization pipeline on complete cost. This test uses the explicitly suggested alternative: an upstream declared interval and a consumer that does not materialize an application PCM ring. It does not reverse R243's measured decision, and the browser still expands audio internally.

Evidence: `silence_manifest.json`, `browser_silence.json`, `browser_silence_followup.json`, `analysis.json` under `evidence/`; formatter and guards in `scripts/build.py`.

## D53 — A sub-millisecond eviction error can discard a full extra GOP

### Question

Does an apparently insignificant cutoff difference destroy retained native rewind coverage? This deliberately exercises an already implemented policy boundary, not a proposal for a second GOP-aware eviction algorithm.

The six-second, video-only AVC fixture has closed two-second GOPs, no B pictures, explicit BT.709 signaling, and three independent fragments. The playhead is first placed at 5.24 seconds.

### Results

| Requested removal | Actual remaining range | Requested rewind at 2.52 s |
|---|---|---|
| None | `[0,6]` | Correct |
| `[0,2.0)` | `[2,6]` | Correct |
| `[0,2.0001)` | `[4,6]` | Unavailable; frame callback timeout |

The **0.0001-second / 0.1-ms** overrun removes the next random-access picture and the following dependency interval, leaving the next usable GOP at four seconds. This is consistent with MSE's coded-frame-removal rules, not proof of a browser defect.

Re-appending only the complete second GOP restores `[2,6]`. The repaired seek at 2.56 seconds and subsequent forward/backward witnesses match the uninterrupted reference, with the same SourceBuffer and EOF. Five witness records each were checked in the safe and repaired arms; all matched the corresponding baseline timestamps and picture hashes. The previously unavailable 2.52-second request is retained as a failure rather than counted as successful.

### Decision

R050 already uses actual random-access boundaries. Add this precision regression only around retention-budget changes or timebase mapping, and inspect actual `buffered` ranges after removal. Do not introduce a duplicate eviction policy or infer physical memory recovery from a smaller logical range.

An initial harness called `endOfStream()` redundantly in the untouched baseline, producing `InvalidStateError` after the picture checks. `browser_evict_initial.json` preserves that harness error. The corrected harness calls EOS only when open; the final three-arm run passes. This was not a failed codec candidate.

Evidence: `browser_evict.json`, `browser_evict_initial.json`, the video manifest and coded fragments.

## D54 — Project source subtitles onto an edited native timeline

### Question and scope

Can ordinary native text cues remain correctly synchronized when an edit cuts through cues or repeats part of a source, without burning captions into video or introducing a custom subtitle renderer?

The explicit rate-1 edit is source `[0,2)` followed by `[4,6)` followed by `[0,2)` again. The same coded GOPs are used, with only their fragment decode times reassigned. All **150 host-decoded output pictures** match that requested ordering exactly. This is a bounded closed-GOP edit, not arbitrary cutting.

Five authored plain-text source cues include a long cue crossing cuts, short boundary-crossing cues, an omitted middle-region cue, and literal `&` and `<literal>` text. The candidate intersects each cue with each selected source interval and translates the intersection into presentation time, creating **seven** native `VTTCue` instances. Each repeated occurrence has its own identity. The candidate escapes text as WebVTT text rather than letting literal markup-like content disappear in the parser.

### Results and controls

* At **18 query positions**, including backward seeks and positions close to cuts, the actual browser active cue set and interpreted text matched an independent query-time oracle. That oracle maps the current presentation time back to source time rather than using the candidate's generated cue list.
* Three repeat/backseek screenshot comparisons have **zero differing color components**. A caption-hidden screenshot of the same paused picture differs, confirming that the screenshot witness contains visible subtitle rendering.
* The unclipped cue projection fails **17 of 18** active-set checks. It leaks cues across cuts and can show duplicate text.
* Unescaped literal input fails **14 of 18** checks because `<literal>` is treated as markup rather than visible characters.
* Overlapping destination intervals, a negative source boundary, a non-unit rate, and fractional millisecond boundaries are rejected by the restricted constructor.
* All three tested presentations reach EOF with an unchanged media source URL; cues and media owners are cleaned up.

### Decision and restrictions

Pursue as a small **edited-timeline/plain-text operation**, not a memory optimization. R048's stopped large-cue-windowing cost experiment is not reopened: this test has only seven final cues and does not attempt cue virtualization.

No ASS positioning, karaoke, region layout, mixed language shaping comparison, timed inline markup, physical display semantics, continuous-frame subtitle correctness, or user source-replacement protocol was qualified. Source-map authority is assumed by the authored edit request, not inferred from damaged media.

Evidence: `captions_manifest.json`, `browser_captions.json`, `caption_*.png`, and screenshot/guard summaries in `analysis.json`.

## D55 — Render bounded finite-filter requests with stable native channel state

### Question and predeclared output contract

Can a browser ConvolverNode process only the source windows required for a finite impulse response, including a correct post-source tail? The 321-tap mono filter is applied independently to two source channels. A target interval includes at most 320 preceding source frames; no future source samples are needed for this causal filter.

The source has **50,003 stereo frames**, with mixed tones/noise, silence, and a distinctive last sample. A NumPy float64 direct-convolution oracle is rounded once to Float32. The declared absolute-output tolerance is **2e-6**. General bit-exact equality is not required or claimed.

### First result: actual channel-tail failure

With default ConvolverNode channel policy and `normalize=false`, full rendering diverged by as much as **0.197954379**. The first above-tolerance errors appear in the right channel at frame **50,048**, after the input ends at 50,003; 275 right-channel tail values exceed tolerance. The source prefix remains within ordinary Float32 rounding error.

Two independently motivated controls fix this fixture:

1. Pin `channelCount=2` with `channelCountMode='explicit'` (both tested `discrete` and `speakers` interpretations work here).
2. Keep the source buffer two-channel through the entire output tail using explicit zero padding.

With the explicit-channel candidate, all **100,646 complete output channel values** are within **2.9802322387695312e-8** of the oracle. This is within the predeclared tolerance, not sample-bit identity.

### Bounded jobs

Four requested intervals contain **8,982 individual channel values**. All match both the independent direct-convolution oracle and the continuous explicit-channel renderer within the declared tolerance. The largest input job has **2,354 stereo frames**, **18,832 bytes** of Float32 sample payload, versus **400,024 sample-payload bytes** for the full source.

The harness still retains the full source/oracle. These are logical input-buffer sizes, not measured process-memory savings. Repeated native context creation, kernel setup, and overlapped inputs could make small jobs slower; no cost claim is made.

Omitting the preceding history fails all three nonzero-start requests, with about 0.03 absolute error. Leaving normalization enabled fails all four requests. The beginning-of-source job correctly needs no preceding history and is not presented as a failing no-halo negative.

### Independent minimal reproducer

A separate 129-frame stereo source has one impulse per channel at frame 128. A sparse 513-tap kernel gives an unambiguous analytical output.

With default channel policy, three right-channel values incorrectly equal the left-channel tail. At frame 256, expected right output is **-0.125**, but actual is **+0.25**, an error of **0.375**. Explicit channel count and padded-source controls each reproduce **all 1,282 output values exactly**.

This isolates an observable channel-tail behavior in Chromium 144. It does not trace the browser's internal decoder/graph implementation or establish behavior in other versions. The Web Audio specification explicitly requires tail-time to be considered when a node's channel count decreases.

### Decision

Pursue bounded finite-filter previews/effects with `normalize=false`, explicit requested channel policy, retained input history, and complete tail lifetime. Do not qualify the default-channel candidate, claim arbitrary real-time graph behavior, or treat this as a general stateful/IIR filter solution.

Evidence: `fir_manifest.json`, `browser_fir.json` (initial negative), `browser_fir_followup.json`, `browser_fir_qualified.json`, `browser_tail_minimal.json`.

## Qualification ledger

`evidence/verification.json` contains **100 post-run consistency assertions, all passing**. Many explicitly require a candidate failure to remain visible. They are not 100 experiments, correctness qualifications of every branch, or performance gates. The candidate-level failed outcomes include seamless late-gap insertion, imprecise eviction retention, unclipped/unescaped subtitles, and default-channel convolution tails.

The current candidate scripts reproduce the final gates. Initial harness behavior and its correction are documented; immutable first-run evidence is not falsely labeled a new playback test.

## Primary references and provenance

* [FLAC format, especially constant subframes](https://www.rfc-editor.org/rfc/rfc9639.html#section-9.2.3).
* [MSE coded-frame removal and active-buffer ranges](https://www.w3.org/TR/media-source-2/). This fetched version is a W3C Working Draft, 7 August 2026; experiments remain tied to Chromium 144.
* [WebVTT cue model and cue text parsing](https://www.w3.org/TR/webvtt1/).
* [Web Audio ConvolverNode and tail-time/channel-count rules](https://www.w3.org/TR/webaudio-1.0/).
* Repo-lineage details are in `REPO_LINEAGE.md`; no production source was bundled or executed.

All media fixtures are authored test data. `sha256.js` is reused from the prior MIT-licensed batch-7 harness; the media/test code in this batch is standalone. No font, browser, decoder library, or executable binary is distributed.

## Additional replay status

After the original individual screens and all 100 consistency checks completed, an additional fresh all-in-one replay hit the outer tool execution limit of 120 seconds during the eviction stage. Its completed initial stages, partial records, and log are retained in `evidence/replay_partial/`, `evidence/replay_status.json`, and `evidence/replay_stdout.txt`. No completed second all-in-one verification run is claimed. This did not replace the original completed evidence.
