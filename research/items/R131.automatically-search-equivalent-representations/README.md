<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Automatically search equivalent representations

Full identity: `R131.automatically-search-equivalent-representations`.

Current scoped decision: **pursue**.

The compound input fails the old owner and passes with the same isolated AAC normalizer plus existing remux behavior. Full packet/host output matches the canonical reference. This is composition evidence for D01/D08, not an independent generic repair-search speedup.

Next action: Use the qualified AAC mechanism; keep track-preserving semantics and avoid adding a generic sink-driven repair search.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D07 — retain_scoped_stop**: Do not add generic repair search from selected-track removal. The accepted subset deliberately excludes audio; sink acceptance is not source validity.

**D11 — qualified_bounded_candidate**: The isolated AAC change plus existing remux normalization admits the compound input; exact output matches the canonical presentation. No second generic search engine needed.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. The compound input fails the old owner and passes with the same isolated AAC normalizer plus existing remux behavior. Full packet/host output matches the canonical reference. This is composition evidence for D01/D08, not an independent generic repair-search speedup.

Next action: Use the qualified AAC mechanism; keep track-preserving semantics and avoid adding a generic sink-driven repair search.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full identity: `R131.automatically-search-equivalent-representations`.

Earlier decision: **stop_current_profile** (actual-route screen).

Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred.

Earlier next action: Reopen only for an authorized repeated-use workload that amortizes measured offline validation or a cheaper trustworthy admission certificate. No automatic routing change.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred. |
| screen | passed | Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred. |
| correctness | passed | Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred. |
| performance | failed | Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred. |
| results | passed | Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred. |
| decision | passed | Bounded two-recipe offline search actually executed AVC/AAC packet-copy faststart and fragmented MP4 candidates. Full decoded video/audio plus packet timing/side-data/configuration admit faststart and reject fragmented output with altered audio/timing; deliberate missing-audio control rejects. Native faststart preserves four sought full pictures and all288000decoded audio samples. Five alternating single-use startup/seek pairs including measured435.0ms complete cold search fail cost gate: median complete task3.672times baseline (range1.303–4.034). Mechanism works as an offline validator, but on-demand search is not worth it for this short source; repeated-use amortization not inferred. |

[New run](../../shared/runs/20260919T223731Z-representation-search-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D07 — Let a native sink expose minimal repair sets, but not define validity**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch01_D01-D07/demuxe_native_screen/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D11 — Require a complete set of repairs before deciding a route is impossible**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch02_D08-D13/demuxe_batch2/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
