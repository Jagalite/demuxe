<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sample-accurate audio boundaries using mux trim and preroll metadata

Full identity: `R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata`.

Current decision: **pursue** (2026-09-19T20:07:16.715931+00:00).

Copied-packet Ogg Opus sample crop is feasible: host and Chrome each produce exactly the expected 55545-sample source slice; 72 packet payload hashes match and missing crop pre-skip fails the length oracle.

## Tested contract

Mono Ogg Opus at 48kHz, interior samples 12345:67890, complete decoder prefix retained, host and browser decodeAudioData

Next action: Qualify minimal retained preroll and concatenated playback only if needed; retain separate destination gates for WebM, MP4 and MSE.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Source contract refined to explicit component profile and exclusions in current decision. |
| prepare | passed | Generated fixtures, source/runtime identities, baseline/oracle and adverse controls pinned in shared run. |
| screen | passed | Copied-packet Ogg Opus sample crop is feasible: host and Chrome each produce exactly the expected 55545-sample source slice; 72 packet payload hashes match and missing crop pre-skip fails the length oracle. |
| correctness | passed | Bounded retained-prefix Ogg crop matches independent continuous-source slices exactly in host and Chrome; wrong pre-skip rejected, contexts closed. |
| performance | not_applicable | This run answers sample fidelity, not speed; retains the full compressed prefix and makes no performance claim. |
| results | passed | Positive, negative and setup-failure observations preserved with source/output manifest and commands. |
| decision | passed | Scoped pursue decision; no production integration or release qualification. |

[Shared run](../../shared/runs/20260919T200716Z-ogg-crop/run.json) · [Browser results](../../shared/runs/20260919T200716Z-ogg-crop/browser-result.json) · [Analysis](../../shared/runs/20260919T200716Z-ogg-crop/analysis.md) · [Manifest](../../shared/runs/20260919T200716Z-ogg-crop/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Historical definitions and evidence remain preserved. Production integration and release qualification are separate.

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D63 — Native clipping of lossless audio at individual sample boundaries**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch14_D62-D64/demuxe_batch14/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D63 — deferred_profile_followup**: Lossless sample clipping is a new explicit operation, not general queue correctness. Preserve the source-derived length/content witnesses and require a maintained excerpt owner.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

## Ecosystem follow-up EB09

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **followup_required**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

Current remux explicitly preserves Opus padding through WebM choice, records initial padding and retains bounded real seek preroll. R094 has scoped sample-boundary evidence, but there is no new proof here that all AAC/MP3/Opus mixed/chunked routes apply trim exactly once.

Next gate / reopening condition: Use independently decoded impulse/channel-marked AAC, MP3 and Opus fixtures at head/tail and seek boundaries; declare each trim owner and sample units. Require exact counts/positions before admitting any new wrapper or split route.

This scoped supplement does not broaden earlier correctness or performance qualification.
