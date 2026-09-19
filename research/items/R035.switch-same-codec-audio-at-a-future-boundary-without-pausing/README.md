<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Switch same-codec audio at a future boundary without pausing

`R035.switch-same-codec-audio-at-a-future-boundary-without-pausing`

Current decision: **pursue**. Same-codec AAC future T=2 replacement commits while playing near .5 s, retains old prefix and exact presentation objects, reaches EOF and observes 440-to-880 Hz change. Stale generation and invalid preparation leave old ranges untouched.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Hashed generated tone clips, reused authored video fragments and browser harness; observed output oracle only. |
| screen | passed | Same-codec AAC future T=2 replacement commits while playing near .5 s, retains old prefix and exact presentation objects, reaches EOF and observes 440-to-880 Hz change. Stale generation and invalid preparation leave old ranges untouched. |
| correctness | pending | Run lossless FLAC digital marker oracle and reject any boundary gap/repeat; current AAC frequency samples do not establish sample-exact non-pausing splice. |
| performance | pending | No equivalent-work benchmark before relevant output correctness gates. |
| results | passed | Immutable shared positive and failed variants registered; each case maps separately to this exact mechanism. |
| decision | passed | Pursue bounded mechanism; no integration or release qualification. |

Next: Run lossless FLAC digital marker oracle and reject any boundary gap/repeat; current AAC frequency samples do not establish sample-exact non-pausing splice.

[Contract and current state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Research-only; shipping behavior unchanged.
