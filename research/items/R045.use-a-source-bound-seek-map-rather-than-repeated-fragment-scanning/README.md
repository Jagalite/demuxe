<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use a source-bound seek map rather than repeated fragment scanning

Full identity: `R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Range reads and identities are bounded, and FFmpeg owns demux indexes; no persistent cross-generation fragment map is exposed. Must measure actual repeated scans before adding a second index owner.

Next action: Record three distant seeks and existing index use; only if repeated discovery remains, build an incremental source-bound metadata map and reject a same-name changed source/corrupt offset.

## Definition and contract

New metadata/index optimization · P2 · PROPOSED / NOT TESTED Extends: R03, R09, R18. Reference primitives: S2, S9, S10. Question. Can a small reusable index bootstrap a distant seek without scanning or appending every preceding fragment? Mechanism. Index validated fragment byte spans, decode/presentation intervals, codec generations and random-access boundaries. Bind the map to source identity. Reuse an existing index where available, or build one incrementally during useful reads; this is metadata caching, not cached transcoded media. Smallest useful experiment. Start with the archived fMP4 fixture. Build a ground-truth map offline, then a bounded parser that builds/uses its own map. Compare repeated seeks against sequential discovery. Test an altered source with the same name, out-of-range offsets and a corrupted index entry.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md)
