<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use a browser audio encoder for the permitted lossy branch

Full identity: `R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch`. Original rank: 230.

Current decision: **pursue** (reconciled from **PURSUE**). No new media execution.

Browser Opus encodes/decodes marked stereo PCM with independently correct tones and51 packets.48648 decoded samples for48000 input exposes648-sample padding that adapter must trim. Capability warrants scoped cost comparison against existing Wasm Opus; no speedup claimed.

Browser Opus produces51 packets and correct stereo tones but48648 decoded samples for48000 input leave648-sample trimming unresolved; support probe alone is not adapter correctness.

Next action: Implement explicit Opus delay/end-padding handling and compare complete independent PCM count/boundaries before cost measurement.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | pending | Browser Opus produces51 packets and correct stereo tones but48648 decoded samples for48000 input leave648-sample trimming unresolved; support probe alone is not adapter correctness. |
| performance | pending | No predeclared equivalent-work benchmark/cost analysis; counts and incidental timings cannot establish performance. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
