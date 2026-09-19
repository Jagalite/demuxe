<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Convert packed DSD directly to the requested PCM rate

Full identity: `R348.convert-packed-dsd-directly-to-the-requested-pcm-rate`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Local adaptation accepts restricted integer inputs and preserves sample rate; DSD-to-44.1 kHz fused packed conversion is not this path. Software output selects device-rate float, but its two actual conversion filters/rounding boundaries must be identified before fusion.

Next action: Trace one DSD64 software path and compare optimized packed-byte cascade with an independently high-precision composed kernel on chunk edges.

## Definition and contract

Investigate fusing a specific DSD-to-PCM low-pass/decimation stage with the following fixed-rate PCM decimator. The candidate avoids generating a high-rate intermediate PCM stream that the application immediately reduces again. FFmpeg's pinned DSD implementation already filters packed bytes with precomputed tables. Replacing a naive bit-expansion loop is therefore not a new optimization; the baseline must retain that existing efficient behavior. [S1, S2] For an illustrative two-stage factor-8 construction, let s[n] be the signed one-bit input, h the first filter, and g the second filter: u[m] = sum_k h[k] s[8m-k]     y[n] = sum_j g[j] u[8n-j]     K[l] = sum_j g[j] h[l-8j]     y[n] = sum_l K[l] s[64n-l]

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R348_R352_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md)
