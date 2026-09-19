<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play an ongoing fMP4 response through one native URL

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Reconciled completed prior evidence: Native URL produces marked audio/video before response EOF with a four-second initial fragment; one-second initial fragment waited for EOF with either known or unknown total length, whereas MSE produced output early. Pursue only for an explicit buffering/latency contract, not assumed low-latency equivalence.

Correctness: **pending**. Performance: **pending**.

With four-second initial fragment, native known/unknown-length URL produces marked A/V before response EOF; original one-second-first-fragment variant waited. MSE control output early. No exact full output or source cancellation/seek fidelity is established by delivery observation.

Next: Declare buffering/latency and cancellation/seek contract, then compare independent full output and adverse truncated response.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
