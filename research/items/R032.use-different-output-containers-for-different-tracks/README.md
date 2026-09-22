<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use different output containers for different tracks

Full identity: `R032.use-different-output-containers-for-different-tracks`.

Current scoped decision: **already_implemented**.

Default native-direct already plays the authored AVC+Vorbis source with audio and seeks. Forced remux rejection does not justify a new split-lane owner for this working source. The screen stops at no new compatibility opportunity.

Next action: Preserve ordinary destination selection; reopen mixed-lane work only for a source whose cheapest complete unchanged route actually fails.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | not_applicable |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D14 — executed_existing_owner_or_control**: The maintained default route plays AVC+Vorbis directly with audio. Forced remux is not the cheapest working route and is correctly excluded; no extra mixed-lane owner justified for this fixture.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **already_implemented**. Default native-direct already plays the authored AVC+Vorbis source with audio and seeks. Forced remux rejection does not justify a new split-lane owner for this working source. The screen stops at no new compatibility opportunity.

Next action: Preserve ordinary destination selection; reopen mixed-lane work only for a source whose cheapest complete unchanged route actually fails.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | not_applicable |
| performance | not_applicable |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full key: `R032.use-different-output-containers-for-different-tracks`

Earlier decision: **pursue** (2026-09-19T21:45:10.321305+00:00).

Actual Chrome same-owner raw AAC/MP3 and WebM Opus audio with H264 fragmented video passes digital marker timing within50ms, no audio gaps above5ms (zero measured), presented pictures/geometry against independent standalone destination, parser partial-append abort/reset, unsupported changeType rejection, forward/backward seek, EOF and cleanup. H264160x96 to VP9WebM240x136 to H264 preserves continuous Opus owner and passes same checks. AAC283 and Opus301 payload hashes match wrapped comparators. After correctness,5alternating preparation pairs plus fresh host wrapping show cold candidate/baseline ratios0.19485 AAC and0.16322 Opus against0.9 threshold; prepared browser alone16.945/19.755ms and13.3/13.87ms. Preserved rejected missing-bsf and empty_moov variants; independent reference corrects prior unsupported VP9 RGB expectation.

Pursue bounded profiles. R031 cost onlyAAC versus optional same-payloadMP4 wrapper; MP3 is capability-only. R032 saves host wrapping in this cold endpoint; no browser decoder speedup. R058 original same-owner codec-change capability has no separate speed claim, performance not applicable. Known encoder priming offsets, digital50ms timing, six-second complete appends only; no sample-exact acoustic sync, live transactional rollback or production admission. Arbitrary invalid incoming append recovery excluded.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T214510Z-mixed-tracks/run.json) · [Analysis](../../shared/runs/20260919T214510Z-mixed-tracks/analysis.md) · [Manifest](../../shared/runs/20260919T214510Z-mixed-tracks/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D14 — Jointly declare selected tracks before beginning native playback**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch03_D14-D20/demuxe_batch3/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.

Imported follow-up: [focused batch 22](../../campaigns/focused-research-batch22.md) (D87). External component evidence only; current decision and stage gates are unchanged.
