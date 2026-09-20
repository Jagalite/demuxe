<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Probe a real six-channel Native FLAC destination

Full key: `R057.probe-a-real-six-channel-native-flac-destination`

Current decision: **pursue** (2026-09-19T20:50:39.914275+00:00).

Both FLAC and MP4 browser decode preserve all96000 signed16 samples in each of6 channels; conversion-policy diagnosis explains nonidentical host/browser float hashes. Direct and MSE playback retain6 channel identities after seeking to0.8s and reach EOF. Stereo downmix, swapped-channel and malformed-input controls reject; contexts close.

Capability and fidelity question is resolved for this16-bit48kHz synthetic destination profile. Original proposal explicitly asks preservation of six distinct channels and contains no speed or resource hypothesis; physical speaker routing,24-bit and production integration are outside this completed profile.

Only this declared component/profile is decided. All failed variants retained. Run directory renamed after capture. Replay into a fresh output directory. No production integration or release qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205039Z-six-channel-closure/run.json) · [Analysis](../../shared/runs/20260919T205039Z-six-channel-closure/analysis.md) · [Manifest](../../shared/runs/20260919T205039Z-six-channel-closure/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
