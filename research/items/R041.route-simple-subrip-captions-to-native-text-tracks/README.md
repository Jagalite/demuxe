<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Route simple SubRip captions to Native text tracks

Full identity: `R041.route-simple-subrip-captions-to-native-text-tracks`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Strict external plain SRT adapter matches hand-authored VTT overlap/multiline cues through five seeks on actual Native direct and remux paths. Remux1s bias applies exactly once; markup/bad time/reversed interval reject and worker cleanup passes.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New subtitle-component candidate · P1 · extends R19 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. For a deliberately small supported subset of simple SubRip captions, convert timing/text to WebVTT or VTTCue objects and keep video/audio Native instead of loading a rich renderer or changing the playback engine. New question versus prior work. R19 preserves embedded rich ASS through libass. This is a cheaper plain-text path, not an ASS-to-text approximation. External SubRip can be tested entirely in JavaScript; embedded extraction is a separate host-FFmpeg screen. Source primitive. WebVTT defines timed cues and a restricted markup vocabulary; HTML provides native text-track integration. [S10, S9]

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R041.route-simple-subrip-captions-to-native-text-tracks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R041.route-simple-subrip-captions-to-native-text-tracks.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R041.route-simple-subrip-captions-to-native-text-tracks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R041.route-simple-subrip-captions-to-native-text-tracks.md)
- [results/full-completion/r41/result.json](../../../results/full-completion/r41/result.json)
