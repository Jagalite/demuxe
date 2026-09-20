<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract a declared lower-frame-rate AV1 operating point before decoding

Full identity: `R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding`.

Current decision: **pursue** (actual_complete_task_performance).

480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms.

Next action: Bounded temporal-layer extraction research complete for declared profile. Integrate only behind validated advertised operating point and exact timestamp contract; separately measure target browser hardware workload.

## Definition and contract

Investigate a source-native lower-frame-rate mode for a genuinely temporally scalable AV1 stream. The AV1 specification defines operating-point masks and layer-based OBU dropping. [S6, S7] Candidate: validate the selected advertised operating point, retain its required OBU payloads and global configuration, normalize the advertised configuration only where needed, construct legal output framing, and decode the extracted stream. This uses an existing independently decodable temporal subset instead of decoding everything and discarding displayed outputs afterward. One spatial layer, two temporal layers, stable dimensions and bit depth, closed qualified starting points, no decoder-model timing fields in the first header-normalization pilot, and an authored base temporal layer. For example, a fixture may offer 60 and 30 presentation instants per second. Those numbers are fixture choices, not claims about arbitrary AV1 files.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Selected advertised temporal subset only; reject unadvertised operating point before output. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | A genuine two-temporal-layer source advertises masks 259 and 257. Exact OBU extraction keeps 12 of 24 timestamps, drops 12 higher-layer OBUs and reduces IVF bytes 22420 to 11657. Independent FFmpeg and libaom operating-point pixels match; Chrome decodes all selected pixels/timestamps exactly. Missing keyframe fails. Restricted stable one-spatial-layer source; not arbitrary AV1 or measured CPU savings. Review correction: the earlier unsupportedMaskRejected field was membership observation only. New callable extractor actually rejects unadvertised mask258; accepted257 output is byte-identical to the independently host/browser-qualified stream. |
| correctness | passed | Restricted AV1 temporal subset: independent FFmpeg and actual Chrome complete pixel/timestamp comparison in prior hashed run; new selector actually rejects unsupported mask before output and reproduces accepted candidate bytes exactly. No tile evidence borrowed. |
| performance | passed | 480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms. |
| results | passed | 480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms. |
| decision | passed | 480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms. |

[New run](../../shared/runs/20260919T205300Z-av1-temporal-cost/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
