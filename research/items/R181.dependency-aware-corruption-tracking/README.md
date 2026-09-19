<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# dependency-aware corruption tracking

Full identity: `R181.dependency-aware-corruption-tracking`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current bridge retains recovery packets and waits for key entry after reset but has no per-picture contamination provenance graph. Historical exact output after next IDR supports conservative recovery, not certification inside arbitrary damaged GOPs.

Next action: Define a source-generation trust flag for one lost nonreference picture and one reference loss before adding per-picture provenance.

## Definition and contract

The test H.264 stream has 36 access units: 3 I, 18 P, and 15 B. Three perturbations were tested. - Removing a chosen non-reference B picture yields 35 decoded frames, and every emitted remaining frame matches the intact stream. - Removing a reference P picture yields 35 frames; the final 12-frame GOP beginning at the next IDR is exact to the intact stream. - Flipping a slice-header bit that changes reference/frame-number handling produces one decoder warning; the final IDR GOP is again exact. This supports a conservative model: non-reference loss contaminates that picture only; reference loss contaminates dependent output until a reset point; malformed reference management should be considered unknown until the next certified reset.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R181.dependency-aware-corruption-tracking.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R181.dependency-aware-corruption-tracking.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R181.dependency-aware-corruption-tracking.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R181.dependency-aware-corruption-tracking.md)
