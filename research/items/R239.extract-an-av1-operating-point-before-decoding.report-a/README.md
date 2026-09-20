<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract an AV1 operating point before decoding

Full identity: `R239.extract-an-av1-operating-point-before-decoding.report-a`.

Current decision: **pursue** (actual_complete_task_performance).

480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms.

Next action: Bounded temporal-layer extraction research complete for declared profile. Integrate only behind validated advertised operating point and exact timestamp contract; separately measure target browser hardware workload.

## Definition and contract

The lab driver uses the installed libaom SVC API to author a real 160×96, 120-frame, 60 fps AV1 sequence with one spatial layer and three temporal layers. Actual frame OBU counts were 30 at temporal ID 0, 30 at ID 1, and 60 at ID 2. The encoder produced operating-point masks 0x107, 0x103 and 0x101. A fixture-scoped parser extracts temporal ID 0, retains its coded frame OBUs, and rewrites the sequence header to advertise one available operating point. The IVF timing is changed from 60 ticks/second with every fourth picture retained to 15 ticks/second with sequential picture indices; presentation timestamps remain the same. The picture payload is not decoded and re-encoded by the extractor. This is not a general-purpose parser for arbitrary AV1 headers.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Selected advertised temporal subset only; reject unadvertised operating point before output. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | The report mechanism now has a real two-layer source and exact layer extraction: selected mask 257 retains 12 of 24 frames with identical coded OBU bytes; independent host decoding, libaom selected operating point and browser pixels/timestamps agree. Missing required keyframe fails. This report-specific evidence does not cover arbitrary masks or decoder-model timing. Review correction: the earlier unsupportedMaskRejected field was membership observation only. New callable extractor actually rejects unadvertised mask258; accepted257 output is byte-identical to the independently host/browser-qualified stream. |
| correctness | passed | Restricted AV1 temporal subset: independent FFmpeg and actual Chrome complete pixel/timestamp comparison in prior hashed run; new selector actually rejects unsupported mask before output and reproduces accepted candidate bytes exactly. No tile evidence borrowed. |
| performance | passed | 480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms. |
| results | passed | 480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms. |
| decision | passed | 480-frame two-temporal-layer authored AV1: actual extraction plus decode returns240pictures byte-exact to full decode followed by output selection. Eleven alternating fresh FFmpeg jobs include source read, OBU parsing/extraction, process startup, decoding and output transfer. Median paired saving19.95%,95%bootstrap [11.70,23.00] clears declared10% gate. Baseline median75.23ms; candidate62.82ms. |

[New run](../../shared/runs/20260919T205300Z-av1-temporal-cost/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
