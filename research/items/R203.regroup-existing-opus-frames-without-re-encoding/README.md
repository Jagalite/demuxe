<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Regroup existing Opus frames without re-encoding

Full identity: `R203.regroup-existing-opus-frames-without-re-encoding`.

Current decision: **pursue** (component_test).

Actual libopus 20/40/60ms regrouping reduces codec packets from 101 to 51/34 and splits back to byte-identical constituent packets. Complete host and Chrome PCM preserve all 96000 samples and trim; incompatible TOC rejected. One-packet-per-page candidate files (21770/21355 bytes) remain larger than the original multipacket-page Ogg (20487 bytes). Aggregation adds 20/40ms availability wait. Viable submission-count tradeoff, not a bandwidth or CPU win. Additional actual media-element lifecycle now starts, seeks to0.8s, observes880Hz, reaches EOF and releases resources for original/40ms/60ms groupings.

Next action: Measure equivalent live submission overhead against the explicit20/40ms availability tradeoff; keep cross-mode sources rejected.

## Definition and contract

301 20-ms Opus packets were repacketized into 151 packets using libopus. Constituent encoded frames were preserved and host 48-kHz decoded PCM is byte-identical. Chromium's 48-kHz decodeAudioData() output is also sample-identical, and both original/grouped Ogg presentations seek and advance without media error. The delivered Ogg writer uses one packet per page, so file size grew from 86,939 to 90,755 bytes despite the lower codec-packet count. This validates packet regrouping, not a bandwidth win or earlier availability. It does not create new random-access points.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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
