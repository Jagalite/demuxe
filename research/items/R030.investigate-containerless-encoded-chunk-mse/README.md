<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Investigate containerless encoded-chunk MSE

Full identity: `R030.investigate-containerless-encoded-chunk-mse`.

Current decision: **pursue** (component_test).

Independent review corrected the VP9/Opus construction order: creating both SourceBuffers before any appendEncodedChunks allows actual green video/882.9Hz audio, seek to0.8s, EOF and cleanup in explicitly flagged Chrome152. Previous quota error was harness initialization order, not environment impossibility. AVC/H265 still explicitly unsupported with either no-B or B-frame source. Default browser remains unexposed. Restricted experimental VP9/Opus feasibility only; full pixels/PCM/config/timestamp fidelity not yet compared.

Next action: Keep frontier route gated; compare complete VP9/Opus decoded pixels/PCM/timing and reconfiguration/cancel controls before any performance study. Track AVC buffering support separately.

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
| correctness | pending | Real flagged native playback witnesses and seek/EOF/cleanup pass for VP9/Opus. Full output fidelity, reconfiguration and malformed chunk controls remain unqualified; AVC destination remains unsupported. |
| performance | pending | Current endpoint is scoped feasibility, not a measured performance claim; reopen for a predeclared equivalent-work benchmark after complete relevant correctness. |
| results | passed | Positive/negative evidence and limitations captured in immutable run. |
| decision | passed | pursue: Independent review corrected the VP9/Opus construction order: creating both SourceBuffers before any appendEncodedChunks allows actual green video/882.9Hz audio, seek to0.8s, EOF and cleanup in explicitly flagged Chrome152. Previous quota error was harness initialization order, not environment impossibility. AVC/H265 still explicitly unsupported with either no-B or B-frame source. Default browser remains unexposed. Restricted experimental VP9/Opus feasibility only; full pixels/PCM/config/timestamp fidelity not yet compared. |

[New run](../../shared/runs/20260919T202600Z-containerless-order/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
