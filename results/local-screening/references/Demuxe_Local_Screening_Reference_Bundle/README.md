# Demuxe local screening reference bundle

This bundle is the self-contained handoff for the ranked local screening campaign.

## Start here

1. `plans/Demuxe_Ranked_Local_Testing_Guide.md` (or `.docx`)
2. `plans/Demuxe_Individual_Runtime_Screening_Plan.md`
3. `SOURCE_MAP.md`
4. Resolve the exact research source for the selected queue item before editing code.

The active first four screens are **R74 → R40 → R01 → R02**.

## Exact origins of the first four

- **R74 — packed-PCM staging bypass**
  - Original executed report: Library `/Demuxe/R70-R75-report.md`
  - Library file ID: `file_00000000ffa081f6ac99b3bf66f517f5`, version `1`
  - Included here: `research/R70-R75-report.md` (text snapshot of the Library report)
  - Raw evidence archive remains in Library: `/Demuxe/demuxe-r70-r75-evidence.tar.gz`
  - Archive Library file ID: `file_00000000cc7881f6b8a283623e2a21cf`
  - Archive SHA-256 from its verification record: `e0d6ab4c58c99fc4878e36ccdf41f20ec5c6cb00c6085b968fe56d1135e98447`
  - Verification record: `/Demuxe/demuxe-r70-r75-package-verification.json`, Library file ID `file_00000000886c81f6a1aee0a778bde29b`

- **R40 — obsolete application seek work / scrub coalescing**
  - Original executed report: Library `/Demuxe/RESULTS_R31_R42.md`
  - Library file ID: `file_00000000d11c81f685b067b14120fd80`, version `1`
  - Included here as the raw Library file: `research/RESULTS_R31_R42.md`
  - Original proposal batch: `/Demuxe/Demuxe_Sandbox_Experiment_Addendum.md`
  - Proposal Library file ID: `file_00000000d63481f6809f362aa074f7f8`

- **R01 — duplicate inspection/source work**
- **R02 — reuse useful startup work**
  - Original research source for both: Library `/Demuxe/Demuxe_Routing_Optimization_Ideas.md`
  - Library file ID: `file_000000002bbc81f6b81149d51500add1`, version `1`
  - Included here as the raw Library file: `research/Demuxe_Routing_Optimization_Ideas.md`
  - **Status:** this document explicitly says source review / experiment design only. In the retrieved corpus there is no separate executed `RESULTS_R01_R02` report. Treat R01/R02 as proposals requiring a current production audit and real-runtime screen, not as prior measured wins.

## Raw versus extracted files

Where Library raw-byte materialization was available, this bundle contains the raw Library file. A few Project/Library items could only be exported through the indexed text view; those are marked as text snapshots in `SOURCE_MAP.md`. The exact Library path + file ID/version remains the source identity when byte-level identity matters.

The large R70–R75 evidence TAR could not be raw-materialized into this session, so the bundle contains its verification record and an exact Library pointer + SHA-256 instead.

## What is included

- Current ranked guide (Word + Markdown)
- Revision 3.0 individual screening plan
- Revision 2.0 impact/qualification plan
- Original R01/R02 backlog
- Original R31–R42 proposal and executed report (contains R40)
- Original standalone `RESULTS.md` for early route experiments
- R43–R57 backlog and executed report
- R70–R75 executed report (contains R74) + evidence verification pointer
- Exact source map for every item in the 17-item active screening queue
- Pinned repository/source references used by the plans
- SHA-256 manifest for every file in this ZIP

Later proposal cards are intentionally not used as substitutes for the ranked queue identities. Resolve later reports separately before re-ranking them.
