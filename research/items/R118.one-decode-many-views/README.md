<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# One decode, many views

`R118.one-decode-many-views`

Current disposition: **pursue**. Component evidence; no production integration or release qualification.

One decoded H.264 source supplied synchronized left/right crop views in two workers. Four paired outputs matched independent same-browser crop rendering and original timestamps; underlying decoded planes matched host oracle. Slow and stale consumer probes preserved the newer output.

Scope limits: Two-view component only; parent source retains the bounded fixture frames. Lease count is not complete native decoder-surface accounting or zero-copy evidence.

- define: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- prepare: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- screen: **passed** — One decoded H.264 source supplied synchronized left/right crop views in two workers. Four paired outputs matched independent same-browser crop rendering and original timestamps; underlying decoded planes matched host oracle. Slow and stale consumer probes preserved the newer output.
- correctness: **pending** — Scoped output checks pass; full affected lifecycle acceptance remains pending: Add bounded live presentation owner with cancel/replace cleanup and a real two-view workload; quantify whether a second decoder is actually avoided in the target UI.
- performance: **pending** — Not measured. Complete missing lifecycle gates and predeclare an actual workload, threshold and complete costs before benchmarking.
- results: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- decision: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.

Next: Add bounded live presentation owner with cancel/replace cleanup and a real two-view workload; quantify whether a second decoder is actually avoided in the target UI.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

[Shared results](../../shared/runs/20260919T200002Z-presentation/results.json) · [Analysis](../../shared/runs/20260919T200002Z-presentation/analysis.md)
