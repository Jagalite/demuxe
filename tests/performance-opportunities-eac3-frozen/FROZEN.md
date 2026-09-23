<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Frozen unsupported-audio comparison harness

The executable harness files in this directory are an unmodified copy of `results/performance-opportunities/eac3-correctness-20260923-d/files/harness/`, created after two CPU attempts were blocked by unrelated edits to the shared `tests/head-to-head/` harness. This additional note is outside the runner's source-hash list. The copy keeps the accepted correctness source hash stable while the shared workspace remains active. It is used for the later E-AC-3 and DTS correctness/CPU runs. The prepared media/runtime snapshot is `build/head-to-head/assets-passing-cpu-exploratory-20260923-01`.

The copy runs from `tests/` so the existing runner's repository-relative lookup remains valid. Recreate it with:

```sh
cp -a results/performance-opportunities/eac3-correctness-20260923-d/files/harness tests/performance-opportunities-eac3-frozen
```

The CPU runner commands are recorded in the `summary.json` files under `results/performance-opportunities/eac3-performance-20260923-f/` and `dts-performance-20260923-b/`. The frozen harness is a test artifact, not a production player route.
