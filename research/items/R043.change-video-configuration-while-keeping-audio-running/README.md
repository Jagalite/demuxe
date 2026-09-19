<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Change video configuration while keeping audio running

`R043.change-video-configuration-while-keeping-audio-running`

Current decision: **pursue**. Actual future AVC video replacements small160x96→large320x180→small160x96 at2/4 s retain original AAC source buffer and 440Hz observed output while playing. Fresh init segments, EOF and reverse/forward seeks pass; stale pre-commit generation and invalid preparation reject.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Hashed generated tone clips, reused authored video fragments and browser harness; observed output oracle only. |
| screen | passed | Actual future AVC video replacements small160x96→large320x180→small160x96 at2/4 s retain original AAC source buffer and 440Hz observed output while playing. Fresh init segments, EOF and reverse/forward seeks pass; stale pre-commit generation and invalid preparation reject. |
| correctness | pending | Run numbered synchronized 360p/720p frame oracles, exact unchanged PCM, paused and seek-during-commit variants, real failed-init rollback and closed-GOP misalignment controls. |
| performance | pending | No equivalent-work benchmark before relevant output correctness gates. |
| results | passed | Immutable shared positive and failed variants registered; each case maps separately to this exact mechanism. |
| decision | passed | Pursue bounded mechanism; no integration or release qualification. |

Next: Run numbered synchronized 360p/720p frame oracles, exact unchanged PCM, paused and seek-during-commit variants, real failed-init rollback and closed-GOP misalignment controls.

[Contract and current state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Research-only; shipping behavior unchanged.
