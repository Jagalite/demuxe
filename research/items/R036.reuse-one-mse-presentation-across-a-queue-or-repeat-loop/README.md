<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse one MSE presentation across a queue or repeat loop

`R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop`

Current decision: **pursue**. Explicit compatible video queue red/green/red maps source epochs to 0/2/4 s on one retained MSE/video presentation with continuous separate audio; played EOF and seeks back .5 and forward4.5. Stale-generation commit rejects without buffer mutation.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Hashed generated tone clips, reused authored video fragments and browser harness; observed output oracle only. |
| screen | passed | Explicit compatible video queue red/green/red maps source epochs to 0/2/4 s on one retained MSE/video presentation with continuous separate audio; played EOF and seeks back .5 and forward4.5. Stale-generation commit rejects without buffer mutation. |
| correctness | pending | Qualify source-linked A/V queue identities with independent PCM and full-frame oracle, subtitles, source replacement during actual pending read and long bounded queue eviction. |
| performance | pending | No equivalent-work benchmark before relevant output correctness gates. |
| results | passed | Immutable shared positive and failed variants registered; each case maps separately to this exact mechanism. |
| decision | passed | Pursue bounded mechanism; no integration or release qualification. |

Next: Qualify source-linked A/V queue identities with independent PCM and full-frame oracle, subtitles, source replacement during actual pending read and long bounded queue eviction.

[Contract and current state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Research-only; shipping behavior unchanged.
