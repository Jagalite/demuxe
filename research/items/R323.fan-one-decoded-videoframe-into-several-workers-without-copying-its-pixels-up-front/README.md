<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fan one decoded VideoFrame into several workers without copying its pixels up front

`R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front`

Current disposition: **pursue**. Component evidence; no production integration or release qualification.

Two actual workers received cloned VideoFrame references, materialized separate cropped regions and matched reference pixels/timestamps for four frames. One 20 ms slow worker, stale generation result and surviving newer-generation output exercised. Peak outstanding transferred references was two; all workers terminated and frames closed.

Scope limits: No explicit copyTo before fanout; browser internal copying and retained native surfaces were not measured. Source generation checked but prompt cancellation of an unresponsive worker remains untested.

- define: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- prepare: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- screen: **passed** — Two actual workers received cloned VideoFrame references, materialized separate cropped regions and matched reference pixels/timestamps for four frames. One 20 ms slow worker, stale generation result and surviving newer-generation output exercised. Peak outstanding transferred references was two; all workers terminated and frames closed.
- correctness: **pending** — Scoped output checks pass; full affected lifecycle acceptance remains pending: Implement enforceable consumer lease expiry/cancellation and measure retention under decoder backpressure before claiming complete multi-consumer correctness or benefit.
- performance: **pending** — Not measured. Complete missing lifecycle gates and predeclare an actual workload, threshold and complete costs before benchmarking.
- results: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- decision: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.

Next: Implement enforceable consumer lease expiry/cancellation and measure retention under decoder backpressure before claiming complete multi-consumer correctness or benefit.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

[Shared results](../../shared/runs/20260919T200002Z-presentation/results.json) · [Analysis](../../shared/runs/20260919T200002Z-presentation/analysis.md)
