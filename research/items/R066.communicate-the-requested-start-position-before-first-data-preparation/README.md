<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Communicate the requested start position before first-data preparation

Full identity: `R066.communicate-the-requested-start-position-before-first-data-preparation`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Reconciled completed prior evidence: Moving this indexed native target seek from loadeddata to loadedmetadata preserves target picture but fetches the same 6296410 bytes and 97 responses; zero-start control passes. No byte-work opportunity demonstrated by this variant; single-run timing differences are not evidence of speedup.

Next action: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

## Definition and contract

Focused startup optimization · P1 · Risk: Medium · PROPOSED / NOT TESTED First environment: Sandbox direct Blob-video pilot; real HTTP-byte impact requires the local environment. Related cards: R02, R44. Proposed mechanism. For resume/chapter playback, let the Native candidate know the desired position before preparing initial data at time zero. Compare assigning currentTime while HAVE_NOTHING against waiting for loadeddata and then seeking. Retain one candidate rather than a throwaway player. What is new. R44 restricted the media supplied to MSE; this uses the direct media element’s own early-start mechanism. It may avoid a redundant initial presentation and callback cycle without inspecting or repackaging every packet.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R066.communicate-the-requested-start-position-before-first-data-preparation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R066.communicate-the-requested-start-position-before-first-data-preparation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R066.communicate-the-requested-start-position-before-first-data-preparation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R066.communicate-the-requested-start-position-before-first-data-preparation.md)
- [results/full-completion/remote-index/result.json](../../../results/full-completion/remote-index/result.json)
