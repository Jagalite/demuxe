<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Nonlinear speed curves without video re-encoding

Current decision: **pursue**. Requested piecewise speeds1/2/0.5 map4s progressive AVC to5.5s with96 coded payloads unchanged and all host/native pictures exact. One prepared pitch-preserving audio output has264000 exact FLAC-decoded reference samples,440Hz maintained and independently authored markers within4.5ms of mapped times.100ms real audio post-roll prevents artificial tail; no internal quiet gaps. Correct fragmented MSE track configuration supports playback/seeks/EOF/stale-generation rejection. Scoped capability, no generalized B-frame/music/performance claim.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Requested piecewise speeds1/2/0.5 map4s progressive AVC to5.5s with96 coded payloads unchanged and all host/native pictures exact. One prepared pitch-preserving audio output has264000 exact FLAC-decoded reference samples,440Hz maintained and independently authored markers within4.5ms of mapped times.100ms real audio post-roll prevents artificial tail; no internal quiet gaps. Correct fragmented MSE track configuration supports playback/seeks/EOF/stale-generation rejection. Scoped capability, no generalized B-frame/music/performance claim. |
| correctness | passed | Independent host packet PTS/DTS/hash and96 decoded picture comparisons;96 full native query pictures plus continuous playback and backward/forward seeks/EOF.264000 PCM samples exact separately prepared atempo reference; marker time errors0.008/0.017/-4.493ms vs30ms gate, pitch440Hz, joinquiet0 and paddedtail0. Source-generation rejects before append. Fixed-map noB/mono profile with real post-roll only; synthetic padding and container/MIME setup failures retained. |
| performance | not_applicable | Literal conversation source defines requested nonlinear timeline capability with copied video and one prepared audio output. No complete-job speed/energy/memory claim; three audio filter branches and100ms post-roll disclosed. A performance benchmark is not an applicable acceptance gate for this bounded fidelity endpoint. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Requested piecewise speeds1/2/0.5 map4s progressive AVC to5.5s with96 coded payloads unchanged and all host/native pictures exact. One prepared pitch-preserving audio output has264000 exact FLAC-decoded reference samples,440Hz maintained and independently authored markers within4.5ms of mapped times.100ms real audio post-roll prevents artificial tail; no internal quiet gaps. Correct fragmented MSE track configuration supports playback/seeks/EOF/stale-generation rejection. Scoped capability, no generalized B-frame/music/performance claim. |

Next/reopen: Require an explicit authorized monotone map, suitable audio context and separately qualified timestamp/B-frame profile. General music/perceptual seam behavior and dynamically changing rates need additional evidence before integration; do not silently pad unavailable tail audio.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
