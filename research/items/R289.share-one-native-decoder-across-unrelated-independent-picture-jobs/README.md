<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share one native decoder across unrelated independent-picture jobs

`R289.share-one-native-decoder-across-unrelated-independent-picture-jobs`

Current disposition: **pursue**. Component evidence; no production integration or release qualification.

Six extracted independent same-configuration H.264 IDR jobs used one decoder. Full pixels equal six separately constructed decoders and host decode. Duplicate source timestamps remained distinct via dispatch identity; canceled job 2 was discarded.

Scope limits: Same configuration synthetic IDR samples only. Configuration signature adverse check is not execution of reconfiguration recovery; no physical native/hardware identity claim.

- define: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- prepare: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- screen: **passed** — Six extracted independent same-configuration H.264 IDR jobs used one decoder. Full pixels equal six separately constructed decoders and host decode. Duplicate source timestamps remained distinct via dispatch identity; canceled job 2 was discarded.
- correctness: **pending** — Scoped output checks pass; full affected lifecycle acceptance remains pending: Add malformed-job recovery, actual incompatible configuration groups and stale output after source-generation replacement; then compare a bounded pool and per-job baseline under an interactive arrival workload.
- performance: **pending** — Not measured. Complete missing lifecycle gates and predeclare an actual workload, threshold and complete costs before benchmarking.
- results: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- decision: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.

Next: Add malformed-job recovery, actual incompatible configuration groups and stale output after source-generation replacement; then compare a bounded pool and per-job baseline under an interactive arrival workload.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

[Shared results](../../shared/runs/20260919T200002Z-presentation/results.json) · [Analysis](../../shared/runs/20260919T200002Z-presentation/analysis.md)
