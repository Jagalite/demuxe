<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fixed Opus gain through codec/container headers

Full identity: `R095.fixed-opus-gain-through-codec-container-headers`. Original rank: 241.

Current decision: **pursue** (reconciled from **PURSUE**). No new media execution.

Requested-6dB combines with existing+3dB Opus header gain. Browser header-only output RMS matches original header plus gain node within0.02%; doubled attenuation differs by50%. Seek/EOF pass. Worth static explicit asset gain, not dynamic volume or quantified CPU claim.

Requested-6dB plus existing+3dB header matches gain-node reference RMS within0.02%; double-attenuation control differs50%, seek and EOF pass.

Next action: Qualify static asset-gain metadata profiles separately from dynamic volume and benchmark only if a real cost claim is needed.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Requested-6dB plus existing+3dB header matches gain-node reference RMS within0.02%; double-attenuation control differs50%, seek and EOF pass. |
| performance | pending | No predeclared equivalent-work benchmark/cost analysis; counts and incidental timings cannot establish performance. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
