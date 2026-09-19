<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep source sample rates across audio-track changes

Full identity: `R052.keep-source-sample-rates-across-audio-track-changes`.

Current decision: **pursue** (2026-09-19T20:07:16.715931+00:00).

Both 44.1-to-48 and 48-to-44.1 kHz AAC split-MSE transitions play expected 440/880Hz markers, retain the same video/audio SourceBuffers, reach EOF and restore earlier buffered audio on backward seek. No sample-exact priming/boundary claim.

## Tested contract

Same AAC-LC stereo profile, source 44.1/48kHz, two-second segments, existing separate AVC video buffer

Next action: Compare decoded boundary PCM/priming and failed replacement rollback before integrating the per-track switch transaction.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Source contract refined to explicit component profile and exclusions in current decision. |
| prepare | passed | Generated fixtures, source/runtime identities, baseline/oracle and adverse controls pinned in shared run. |
| screen | passed | Both 44.1-to-48 and 48-to-44.1 kHz AAC split-MSE transitions play expected 440/880Hz markers, retain the same video/audio SourceBuffers, reach EOF and restore earlier buffered audio on backward seek. No sample-exact priming/boundary claim. |
| correctness | pending | Audible rate/marker, EOF, same-owner and backward-seek screens passed; sample-exact boundary PCM and failed replacement controls remain. |
| performance | pending | Do not benchmark replacement savings before remaining fidelity/lifecycle gates. |
| results | passed | Positive, negative and setup-failure observations preserved with source/output manifest and commands. |
| decision | passed | Scoped pursue decision; no production integration or release qualification. |

[Shared run](../../shared/runs/20260919T200716Z-audio-mse/run.json) · [Browser results](../../shared/runs/20260919T200716Z-audio-mse/browser-result.json) · [Analysis](../../shared/runs/20260919T200716Z-audio-mse/analysis.md) · [Manifest](../../shared/runs/20260919T200716Z-audio-mse/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Historical definitions and evidence remain preserved. Production integration and release qualification are separate.
