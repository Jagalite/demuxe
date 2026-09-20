<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Investigate containerless encoded-chunk MSE

Full identity: `R030.investigate-containerless-encoded-chunk-mse`.

Current decision: **stop_current_profile** (actual_destination_full_pcm_correctness_failure).

Experimental containerless VP9/Opus route fails full audio fidelity on genuine2sec changing-video/seeded-noise source. Native WebM AudioWorklet capture matches all96000 independent offline decoded samples exactly after measured capture latency. Same encoded packets through appendEncodedChunks differ in336 of those samples and emit648 nonzero samples after the reference end. All48 video timestamps/full-frame fingerprints match baseline, so video/tone-only screen missed the audio-boundary error. AVC still unsupported in experimental runtime. No performance comparison allowed after this correctness failure.

Next action: Reopen only with explicit codec-delay/end-trim mapping that passes full seeded-noise PCM and timeline oracle, or when AVC support becomes available. Current experimental A/V adapter is unqualified; do not benchmark or integrate.

## Definition and contract

Frontier · New experimental API hypothesis · P3 · Risk: High First environment: Experimental Chromium only. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Investigate feeding demuxed EncodedAudioChunk/EncodedVideoChunk objects into MSE so the browser owns A/V playback without an intermediate MP4/WebM mux step. This could sit between raw demux and normal Native presentation. Source basis. Chromium SourceBuffer IDL contains appendEncodedChunks and configuration-based changeType behind MediaSourceExtensionsForWebCodecs. The inspected feature declaration marks it experimental. This is not evidence of a shipped portable API. [C3, C4] First agent experiment. First establish actual exposure in a controlled experimental browser, explicitly recording flags. Start with AVC/AAC and test timestamp reordering, track reconfiguration, bounded queues and destruction. Compare with equivalent fMP4 MSE only after correctness.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Restricted experimental VP9/Opus config-based native A/V; create all track buffers before initializing any track. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | Independent review corrected the VP9/Opus construction order: creating both SourceBuffers before any appendEncodedChunks allows actual green video/882.9Hz audio, seek to0.8s, EOF and cleanup in explicitly flagged Chrome152. Previous quota error was harness initialization order, not environment impossibility. AVC/H265 still explicitly unsupported with either no-B or B-frame source. Default browser remains unexposed. Restricted experimental VP9/Opus feasibility only; full pixels/PCM/config/timestamp fidelity not yet compared. |
| correctness | failed | Experimental containerless VP9/Opus route fails full audio fidelity on genuine2sec changing-video/seeded-noise source. Native WebM AudioWorklet capture matches all96000 independent offline decoded samples exactly after measured capture latency. Same encoded packets through appendEncodedChunks differ in336 of those samples and emit648 nonzero samples after the reference end. All48 video timestamps/full-frame fingerprints match baseline, so video/tone-only screen missed the audio-boundary error. AVC still unsupported in experimental runtime. No performance comparison allowed after this correctness failure. |
| performance | not_applicable | Actual full-signal correctness failed; later performance is not applicable for this rejected adapter profile. |
| results | passed | Experimental containerless VP9/Opus route fails full audio fidelity on genuine2sec changing-video/seeded-noise source. Native WebM AudioWorklet capture matches all96000 independent offline decoded samples exactly after measured capture latency. Same encoded packets through appendEncodedChunks differ in336 of those samples and emit648 nonzero samples after the reference end. All48 video timestamps/full-frame fingerprints match baseline, so video/tone-only screen missed the audio-boundary error. AVC still unsupported in experimental runtime. No performance comparison allowed after this correctness failure. |
| decision | passed | Experimental containerless VP9/Opus route fails full audio fidelity on genuine2sec changing-video/seeded-noise source. Native WebM AudioWorklet capture matches all96000 independent offline decoded samples exactly after measured capture latency. Same encoded packets through appendEncodedChunks differ in336 of those samples and emit648 nonzero samples after the reference end. All48 video timestamps/full-frame fingerprints match baseline, so video/tone-only screen missed the audio-boundary error. AVC still unsupported in experimental runtime. No performance comparison allowed after this correctness failure. |

[New run](../../shared/runs/20260919T211200Z-containerless-fidelity/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
