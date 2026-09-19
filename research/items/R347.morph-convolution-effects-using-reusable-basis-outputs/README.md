<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Morph convolution effects using reusable basis outputs

Full identity: `R347.morph-convolution-effects-using-reusable-basis-outputs`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current native graph has scalar gain, not a persistent convolution-basis morphing effect or repeated automation-edit cache. Historical correct basis outputs do not make this an optimization of the actual admitted gain operation.

Next action: Reopen for a requested two-basis morph effect and compare cached outputs with persistent optimized dual convolution.

## Definition and contract

For fixed impulse responses h_i and declared output-time weights w_i[n]: h_n[k] = sum_i w_i[n] h_i[k]     z_i[n] = sum_k h_i[k] x[n-k]     y[n] = sum_i w_i[n] z_i[n] Expanding the sums gives the same output as direct time-varying convolution with h_n in exact arithmetic. This defines one specific automation contract, not all possible notions of changing a room or filter over time. Web Audio's ConvolverNode is a linear-convolution primitive; its specification warns that replacing an impulse-response buffer can glitch and discusses crossfading separate nodes. A persistent, correctly initialized convolver bank is therefore a mandatory baseline, not a newly invented crossfade technique. [S8] Place an impulse before a weight change and compare its continuing tail afterward. Moving weights to the input side would use w_i[n-k] rather than w_i[n] and generally gives a different result; include that incorrect construction as a negative control.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R347.morph-convolution-effects-using-reusable-basis-outputs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R347.morph-convolution-effects-using-reusable-basis-outputs.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R347.morph-convolution-effects-using-reusable-basis-outputs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R347.morph-convolution-effects-using-reusable-basis-outputs.md)
