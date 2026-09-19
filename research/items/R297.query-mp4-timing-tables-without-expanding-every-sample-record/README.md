<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Query MP4 timing tables without expanding every sample record

Full identity: `R297.query-mp4-timing-tables-without-expanding-every-sample-record`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The cheap JS probe reads bounded track metadata rather than expanding all timing samples. Real demux indexing resides inside FFmpeg with a 4 MiB index cap. The reported million-sample run index is a new parser representation and is not evidence that the current owner expands 22 MB of JS objects.

Next action: Inspect the pinned FFmpeg MOV timing/index allocation on one long constant-timing source before implementing an index; compare real memory with an optimized typed-array oracle and preserve signed composition offsets as a separate gate.

## Definition and contract

Type: Metadata representation/query optimization. First owner: Parser/index component. Related: R45, R75; distinct from compressing a derived sparse keyframe index. Hypothesis. Keep source metadata in its original run structure and generate detailed per-sample records only for an active window. Build compact cumulative indexes over timing and chunk runs to support random queries. Source basis. MP4Box.js stores stts timing as sample counts and duration deltas and provides an unpack operation that assigns timestamps to individual sample records. This is a concrete representation contrast, not evidence that Demuxe uses that exact expansion. [S5] For a run beginning at sample ordinal s with decode time t and constant delta d, an ordinal s+j has decode time t+jd. A cumulative run index can locate the relevant run without materializing a timestamp for every sample.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md)
