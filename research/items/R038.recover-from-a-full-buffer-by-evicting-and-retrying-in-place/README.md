<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover from a full buffer by evicting and retrying in place

Full identity: `R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place`. Original rank: 148.

Current decision: **pursue** (reconciled from **PURSUE**). No new media execution.

After an injected one-shot quota refusal, real buffered removal plus one retry reaches marked A/V/EOF; second quota fails afterone retry and InvalidStateError is not retried. No genuine memory-pressure or production controller qualification claimed.

Injected one-shot quota uses real removal and one successful retry; second quota stops afterone retry, unrelated InvalidStateError is not retried, all clean up.

Next action: Test genuine memory pressure and maintained ownership before production admission.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Injected one-shot quota uses real removal and one successful retry; second quota stops afterone retry, unrelated InvalidStateError is not retried, all clean up. |
| performance | pending | No predeclared equivalent-work benchmark/cost analysis; counts and incidental timings cannot establish performance. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
