<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Opus repacketization without PCM decoding

Full identity: `R093.opus-repacketization-without-pcm-decoding`.

Current decision: **pursue** (component_test).

Actual libopus 20/40/60ms regrouping reduces codec packets from 101 to 51/34 and splits back to byte-identical constituent packets. Complete host and Chrome PCM preserve all 96000 samples and trim; incompatible TOC rejected. One-packet-per-page candidate files (21770/21355 bytes) remain larger than the original multipacket-page Ogg (20487 bytes). Aggregation adds 20/40ms availability wait. Viable submission-count tradeoff, not a bandwidth or CPU win. Additional actual media-element lifecycle now starts, seeks to0.8s, observes880Hz, reaches EOF and releases resources for original/40ms/60ms groupings.

Next action: Measure equivalent live submission overhead against the explicit20/40ms availability tradeoff; keep cross-mode sources rejected.

## Definition and contract

Question. Can packet overhead and submission frequency be traded against availability latency without re-encoding audio? What differs from earlier work. Not MSE append batching: changes the codec packet grouping itself while preserving the constituent encoded frames. Input scope. Elementary Opus with compatible mode, bandwidth, frame size and channels; no generalized multistream claim. Mechanism to test. Group existing compatible frames into fewer packets or split a previously grouped packet back into its existing constituent frames. Smallest experiment. 1. Compare existing 20 ms frames in 20/40/60 ms packet groupings. 2. Split a valid multi-frame packet back to the original frame granularity. 3. Mux each form and compare browser and reference-decoder outputs, startup and seek behavior.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Fixed-mode mono Opus grouping with exact decoded content, compatible split-back, native playback and seek lifecycle. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | Actual libopus 20/40/60ms regrouping reduces codec packets from 101 to 51/34 and splits back to byte-identical constituent packets. Complete host and Chrome PCM preserve all 96000 samples and trim; incompatible TOC rejected. One-packet-per-page candidate files (21770/21355 bytes) remain larger than the original multipacket-page Ogg (20487 bytes). Aggregation adds 20/40ms availability wait. Viable submission-count tradeoff, not a bandwidth or CPU win. Additional actual media-element lifecycle now starts, seeks to0.8s, observes880Hz, reaches EOF and releases resources for original/40ms/60ms groupings. |
| correctness | passed | Combined immutable complete host/browser PCM, exact split-back frames, incompatible TOC rejection, actual three-file playback/seek/tone/EOF and cleanup. Restricted mono fixed-configuration profile only. |
| performance | not_applicable | Current endpoint is scoped feasibility, not a measured performance claim; reopen for a predeclared equivalent-work benchmark after complete relevant correctness. |
| results | passed | Positive/negative evidence and limitations captured in immutable run. |
| decision | passed | pursue: Actual libopus 20/40/60ms regrouping reduces codec packets from 101 to 51/34 and splits back to byte-identical constituent packets. Complete host and Chrome PCM preserve all 96000 samples and trim; incompatible TOC rejected. One-packet-per-page candidate files (21770/21355 bytes) remain larger than the original multipacket-page Ogg (20487 bytes). Aggregation adds 20/40ms availability wait. Viable submission-count tradeoff, not a bandwidth or CPU win. Additional actual media-element lifecycle now starts, seeks to0.8s, observes880Hz, reaches EOF and releases resources for original/40ms/60ms groupings. |

[New run](../../shared/runs/20260919T201000Z-opus-lifecycle/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
