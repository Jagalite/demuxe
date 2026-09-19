<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache the peak envelope of every fixed-gain mix

Full identity: `R316.cache-the-peak-envelope-of-every-fixed-gain-mix`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

There is no fixed-gain multistem peak-query service in the current player. The report itself needs about 1493 repeated queries to repay Python hull construction; using it for one playback gain setting would add preparation with no relevant amortization.

Next action: Reopen for a measured many-query fader-preview consumer and compare total hull construction plus queries with exhaustive vectorized scans.

## Definition and contract

Type: Repeated mix analysis through computational geometry. Mechanism and derivation. For synchronized stems, let z[n] be the vector of sample values across stems. For constant gain vector g, the sample peak is P(g) = max_n |g^T z[n]|. Form the symmetric set S = {z[n], -z[n]} and retain the vertices V of its convex hull. A linear functional achieves its maximum over that hull at a vertex, so P(g) = max_{v in V} g^T v. This derivation concerns exact arithmetic on the chosen sample vectors. First scope. Two synchronized integer-PCM stems, fixed rational gains, exact orientation predicates, sufficiently wide arithmetic, no clipping or nonlinear processing, and sample-peak value only. Do not claim earliest peak location without additional tie metadata or a direct follow-up check.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md)
