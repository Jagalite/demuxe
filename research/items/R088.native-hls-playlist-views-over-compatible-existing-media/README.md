<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native HLS playlist views over compatible existing media

Full identity: `R088.native-hls-playlist-views-over-compatible-existing-media`.

Current decision: **pursue** (actual_destination_cost_with_host_timeline_oracle).

Native HLS, direct-file and application-MSE each rendered marked A/V, sought and reached EOF in seven rotated triplets. Same timeline-normalized prepared bytes: all143 codec packets, rational PTS/DTS/durations and host decoded pictures/PCM match source. Median first A/V HLS79.5ms, direct92.6ms, MSE78.7ms. HLS-minus-direct paired median-14.7ms,95%bootstrap[-34.89999997615814, 13.300000011920929]; upper bound meets declared100ms startup regression budget. No significant speedup claim.

Next action: Bounded finite H264/AAC HLS destination research gates complete with explicit timeline/duration adapter. Production manifest ownership/authorization and long segmented-media integration remain separate; no CPU or speedup promotion.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Scoped143 coded packets and integer packet times/durations, full host pixels/PCM exact; native HLS/direct/MSE actual marked A/V, seek/EOF/cleanup; previous wrong-range rejection retained. Exact browser waveform and arbitrary sources not claimed. |
| performance | passed | Native HLS, direct-file and application-MSE each rendered marked A/V, sought and reached EOF in seven rotated triplets. Same timeline-normalized prepared bytes: all143 codec packets, rational PTS/DTS/durations and host decoded pictures/PCM match source. Median first A/V HLS79.5ms, direct92.6ms, MSE78.7ms. HLS-minus-direct paired median-14.7ms,95%bootstrap[-34.89999997615814, 13.300000011920929]; upper bound meets declared100ms startup regression budget. No significant speedup claim. |
| results | passed | Native HLS, direct-file and application-MSE each rendered marked A/V, sought and reached EOF in seven rotated triplets. Same timeline-normalized prepared bytes: all143 codec packets, rational PTS/DTS/durations and host decoded pictures/PCM match source. Median first A/V HLS79.5ms, direct92.6ms, MSE78.7ms. HLS-minus-direct paired median-14.7ms,95%bootstrap[-34.89999997615814, 13.300000011920929]; upper bound meets declared100ms startup regression budget. No significant speedup claim. |
| decision | passed | Native HLS, direct-file and application-MSE each rendered marked A/V, sought and reached EOF in seven rotated triplets. Same timeline-normalized prepared bytes: all143 codec packets, rational PTS/DTS/durations and host decoded pictures/PCM match source. Median first A/V HLS79.5ms, direct92.6ms, MSE78.7ms. HLS-minus-direct paired median-14.7ms,95%bootstrap[-34.89999997615814, 13.300000011920929]; upper bound meets declared100ms startup regression budget. No significant speedup claim. |

[New run](../../shared/runs/20260919T205900Z-hls-duration/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
