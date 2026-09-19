<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sample-accurate audio boundaries using mux trim and preroll metadata

Full identity: `R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current path preserves source delay/padding for whole playback; it lacks arbitrary sample-domain excerpt authoring and Ogg granule/preroll mapping. Element currentTime cannot supply sample-exact cut evidence.

Next action: Scope one Ogg Opus interior sample cut with retained preroll and packet identity; packet-only cut is adverse control, and direct/MSE metadata mappings remain separate.

## Definition and contract

Question. Can a compressed audio excerpt have exact audible boundaries without decoding and re-encoding its edge? What differs from earlier work. Deepens excerpt/queue work: the new target is sample-domain trim semantics rather than packet alignment or visible clock continuity. Input scope. Start with Ogg Opus direct playback, whose pre-skip and end-trim semantics explicitly support encoded-stream cropping; WebM and MP4 are separately qualified mappings. Mechanism to test. Keep the encoded frames needed for decoder state, then describe which leading/trailing decoded samples should be omitted through appropriate container metadata. Smallest experiment. 1. Start with Ogg Opus whole-stream priming/end-trimming and arbitrary sample-accurate crops, then test equivalent WebM/MP4 constructions separately. 2. Cut a deterministic impulse/tone source inside a codec frame with explicit preroll. 3. Compare decoded and captured browser output lengths and boundary markers, then concatenate short excerpts.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R88-R101-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R88-R101-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md)
