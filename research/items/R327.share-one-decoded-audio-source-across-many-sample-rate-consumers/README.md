<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share one decoded audio source across many sample-rate consumers

Full identity: `R327.share-one-decoded-audio-source-across-many-sample-rate-consumers`.

Current decision: **pursue** (2026-09-19T19:59:33.240223+00:00).

A real host FLAC decoder feeds bounded PCM queues to three persistent resamplers. Outputs at 32000/44100/48000 Hz exactly match independent decode paths (64000/88200/96000 stereo frames). Actual fanout backpressures; slow rejection and epoch tests are separate policy components, not integration proof.

## Contract

Share canonical source-rate PCM among bounded playback, analysis, waveform and export consumers with separately specified transforms. Compare independent decoders and ensure slow consumers cannot retain unbounded history.

Next action: Exercise actual consumer cancellation/source replacement under one owned browser PCM broker, then benchmark equivalent independent persistent decoders including all queues and copies.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Source-grounded contract retained; current scope and falsifier narrowed in run analysis. |
| prepare | passed | Generated stereo FLAC, three independent decoder references, persistent resampling and bounded queue control executed. |
| screen | passed | A real host FLAC decoder feeds bounded PCM queues to three persistent resamplers. Outputs at 32000/44100/48000 Hz exactly match independent decode paths (64000/88200/96000 stereo frames). Actual fanout backpressures; slow rejection and epoch tests are separate policy components, not integration proof. |
| correctness | pending | Output fidelity passed for three sample rates; actual cancellation/source replacement not exercised, only separate policy controls. |
| performance | pending | Lifecycle correctness gate incomplete; no runtime gain inferred from one versus three decoder counts. |
| results | passed | Commands, output identities, source/runtime manifest, limitations and expected adverse outcomes captured. |
| decision | passed | Scoped disposition recorded; integration and release qualification remain separate. |

[Run and environment](evidence/20260919T195933Z-audio-fanout/run.json) · [Results](evidence/20260919T195933Z-audio-fanout/results.json) · [Manifest](evidence/20260919T195933Z-audio-fanout/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [All evidence](evidence/index.json)

No production integration or release qualification is claimed. Historical bytes and original definition retained.
