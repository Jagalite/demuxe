<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make split-buffer audio switching transactional

`R015.make-split-buffer-audio-switching-transactional`

Current decision: **pursue**. Paused same-codec AAC switch at future T=2 after seek-before-commit to .25 s; old prefix retained and 440-to-880 Hz observation changes, video and both buffer identities retained. Stale generation and invalid MIME preflight leave ranges unchanged.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Hashed generated tone clips, reused authored video fragments and browser harness; observed output oracle only. |
| screen | passed | Paused same-codec AAC switch at future T=2 after seek-before-commit to .25 s; old prefix retained and 440-to-880 Hz observation changes, video and both buffer identities retained. Stale generation and invalid MIME preflight leave ranges unchanged. |
| correctness | pending | Capture sample-exact digital marker PCM across commit; test real failing append rollback and cancel/source change during in-flight preparation. |
| performance | pending | No equivalent-work benchmark before relevant output correctness gates. |
| results | passed | Immutable shared positive and failed variants registered; each case maps separately to this exact mechanism. |
| decision | passed | Pursue bounded mechanism; no integration or release qualification. |

Next: Capture sample-exact digital marker PCM across commit; test real failing append rollback and cancel/source change during in-flight preparation.

[Contract and current state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Research-only; shipping behavior unchanged.
