<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Retarget in-flight decoding instead of restarting a forward scrub

`R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub`

Current disposition: **stop_current_profile**. Component evidence; no production integration or release qualification.

Continuing H.264 decode retargeted 3→8→10 and published only frame 10, matching host output. Current UI already coalesces scrub commits; this component submitted 12 packets versus 11 needed for the final-only target baseline, so it establishes no saved work for the present UI.

Scope limits: Eligibility predicates reject backward/source changes, but their full restart paths were not executed. No user latency claim.

- define: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- prepare: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- screen: **passed** — Continuing H.264 decode retargeted 3→8→10 and published only frame 10, matching host output. Current UI already coalesces scrub commits; this component submitted 12 packets versus 11 needed for the final-only target baseline, so it establishes no saved work for the present UI.
- correctness: **pending** — Scoped output checks pass; full affected lifecycle acceptance remains pending: Reopen when a real workload issues multiple already-started forward seeks; execute source/config changes, backward restart and stale callbacks before performance testing.
- performance: **not_applicable** — Current final-only scrub has no demonstrated redundant decode opportunity; no benchmark warranted.
- results: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.
- decision: **passed** — Scoped contract, exact commands/fixtures, immutable outputs and decision recorded for this run; not production qualification.

Next: Reopen when a real workload issues multiple already-started forward seeks; execute source/config changes, backward restart and stale callbacks before performance testing.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

[Shared results](../../shared/runs/20260919T200002Z-presentation/results.json) · [Analysis](../../shared/runs/20260919T200002Z-presentation/analysis.md)
