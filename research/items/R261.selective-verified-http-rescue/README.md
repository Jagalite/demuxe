<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# selective verified HTTP rescue

Full identity: `R261.selective-verified-http-rescue`. Original rank: 165.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current authorized RangeReader validates ETag/size and caches ranges but has no trusted per-chunk manifest/local-corruption repair source. Hash rescue requires explicit trust and substitution ownership, not generic retry.

No matching candidate/reference/control execution for this exact gate. Trusted per-chunk manifest and authorized repair substitution component with bad-response control.

Next action: Define trusted manifest identity and one two-bad-chunk rescue component; exact whole-file hash and tampered response rejection required, keeping credentials/ETag changes separate. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Trusted per-chunk manifest and authorized repair substitution component with bad-response control. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Trusted per-chunk manifest and authorized repair substitution component with bad-response control. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
