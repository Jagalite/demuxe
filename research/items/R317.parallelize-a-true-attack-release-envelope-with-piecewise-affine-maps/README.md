<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize a true attack/release envelope with piecewise-affine maps

Full identity: `R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The report floating transfer-curve implementation exceeds its 1e-12 tolerance by orders of magnitude and is slower. Current scalar/audio ring operations do not need this recurrence. Preserve the exact rational identity but reject that floating implementation rather than marking it merely blocked.

Next action: Reopen only with a separately justified finite-precision representation preserving branch decisions; compare optimized sequential/across-channel baseline.

## Definition and contract

Type: Nonlinear stateful audio-processing research; mathematical equivalence first. Source basis. FFmpeg's compand envelope updates volume toward the current input magnitude using one coefficient when the magnitude increases and another when it decreases. That is not the max-with-decay recurrence used in R294. [S7] Mechanism. For magnitude p and retention factors 0 < a_attack, a_release < 1, define f_p(e) = a_attacke + (1-a_attack)p when e < p, and a_releasee + (1-a_release)p otherwise. Both branches meet at p and have positive slope. The mapping is therefore continuous, strictly increasing, and piecewise affine. A block is a composition of these maps and has a piecewise-affine transfer curve from incoming to outgoing state.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md)
