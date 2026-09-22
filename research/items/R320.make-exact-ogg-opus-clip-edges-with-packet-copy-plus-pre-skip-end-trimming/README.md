<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make exact Ogg Opus clip edges with packet copy plus pre-skip/end trimming

Full identity: `R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming`.

Current scoped decision: **pursue**.

The current CAF remux retains packet bytes but emits 143 extra sample frames. Translating the declared Opus packet table into Ogg trim metadata returns exact reference PCM and passes guarded construction, maintained lifecycle and frozen-runtime cost. The prior host-subprocess clip-cost stop remains valid at its own scope.

Next action: Add a bounded CAF Opus preparation path only with proven packet-table/configuration guards; preserve pre-skip and final granule. Do not broaden to arbitrary CAF cookies or Opus packet forms.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D69 — qualified_bounded_candidate**: Qualify declared-table CAF Opus-to-Ogg projection. Current remux keeps packet bytes but returns 143 extra frames; the candidate returns exact declared PCM and passes lifecycle/cost.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. The current CAF remux retains packet bytes but emits 143 extra sample frames. Translating the declared Opus packet table into Ogg trim metadata returns exact reference PCM and passes guarded construction, maintained lifecycle and frozen-runtime cost. The prior host-subprocess clip-cost stop remains valid at its own scope.

Next action: Add a bounded CAF Opus preparation path only with proven packet-table/configuration guards; preserve pre-skip and final granule. Do not broaden to arbitrary CAF cookies or Opus packet forms.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full key: `R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming`

Earlier decision: **stop_current_profile** (2026-09-19T21:45:10.321305+00:00).

Exact crop12345:67890 retains complete compressed prefix and55545 mono48k float samples, bit-identical to same-decoder continuous reference; wrong preskip fails. Five fresh alternating cold copy-author+decode pairs cost54.999ms versus32.198ms full decode+slice, ratio1.70814 fails0.9. Prepared decode median30.247ms reported separately, excludes authoring. Initial overlapping timings retained invalid. Earlier independent browser exactness and shortened-preroll mismatch remain pinned.

Stop current cold Python page-authoring cost profile. Exact Ogg sample-edge capability remains valid with fullprefix; prepared output has separate tradeoffs but measured savings below10percent. Reopen with faster page authoring or applicable repeatedly consumed clip workload and full endpoint cost.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T214510Z-ogg-exact-cost/run.json) · [Analysis](../../shared/runs/20260919T214510Z-ogg-exact-cost/analysis.md) · [Manifest](../../shared/runs/20260919T214510Z-ogg-exact-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Disposition vocabulary normalized 2026-09-19T21:48:27.630401+00:00; no new execution.

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D69 — Translate the packet table, not just the packet bytes**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch16_D68-D70/demuxe_batch16/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
