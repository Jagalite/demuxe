<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode a GOP once for exact reverse-frame playback

`R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity`

Current disposition: **pursue**. Component evidence; no production integration or release qualification.

One closed 12-frame H.264 I/P GOP decoded once and retained for reverse hash/timestamp presentation; all frames exact against independent host decode. 55,296 visible plane bytes; 24-frame budget and dependent-entry controls rejected before decode; retained frames closed.

Scope limits: Immutable closed GOP cache batch only; no B/open GOP, renderer cadence, long-GOP fallback, or production seek lifecycle.

- define: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- prepare: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- screen: **passed** — One closed 12-frame H.264 I/P GOP decoded once and retained for reverse hash/timestamp presentation; all frames exact against independent host decode. 55,296 visible plane bytes; 24-frame budget and dependent-entry controls rejected before decode; retained frames closed.
- correctness: **passed** — One closed 12-frame H.264 I/P GOP decoded once and retained for reverse hash/timestamp presentation; all frames exact against independent host decode. 55,296 visible plane bytes; 24-frame budget and dependent-entry controls rejected before decode; retained frames closed. Immutable closed GOP cache batch only; no B/open GOP, renderer cadence, long-GOP fallback, or production seek lifecycle.
- performance: **pending** — Not measured. Complete missing lifecycle gates and predeclare an actual workload, threshold and complete costs before benchmarking.
- results: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- decision: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.

Next: Add actual reverse UI presenter, cache replacement/cancellation and GOP capability parser; then compare persistent cached baseline with declared byte budget.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

[Shared results](../../shared/runs/20260919T200002Z-presentation/results.json) · [Analysis](../../shared/runs/20260919T200002Z-presentation/analysis.md)
