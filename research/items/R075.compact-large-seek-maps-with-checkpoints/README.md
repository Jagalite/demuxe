<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compact large seek maps with checkpoints

Full identity: `R075.compact-large-seek-maps-with-checkpoints`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The current JS metadata probe is bounded and does not retain a dense 100000-entry seek map; FFmpeg owns the live demux index under a 4 MiB cap. The reported delta/checkpoint representation saves synthetic array bytes but does not identify a current array owner to replace.

Next action: Inspect one large-source real FFmpeg index allocation and expose its actual query/identity contract before testing block-16 deltas.

## Definition and contract

Question. Can a source-bound immutable seek map retain less array storage by encoding time/byte deltas between absolute checkpoints? This extends R45's representation, not its cache or scan-avoidance claim. The Node pilot constructs 100,000 synthetic monotonic time/offset entries. Offsets begin above 4 GiB and extend beyond 156 GB; times use a 90 kHz tick scale with variable intervals. The baseline uses two Float64Arrays, totaling 1,600,000 bytes. The candidate keeps absolute checkpoints, byte pointers and unsigned variable-length deltas at checkpoint sizes 16, 32, 64 and 128. Query figures are averages derived from the median 100,000-query batch, not individual-call medians or p95 latency. Exact array byte counts exclude object overhead, source arrays used by the oracle, process RSS and peak construction memory. Single observed construction times are retained in JSON but not treated as stable repeated benchmarks.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R075.compact-large-seek-maps-with-checkpoints.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R075.compact-large-seek-maps-with-checkpoints.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R075.compact-large-seek-maps-with-checkpoints.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R075.compact-large-seek-maps-with-checkpoints.md)
