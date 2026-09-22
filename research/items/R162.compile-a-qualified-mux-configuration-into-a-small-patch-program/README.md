<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile a qualified mux configuration into a small patch program

## Production integration — 2026-09-21

**existing_repairs_retained_patch_deferred**. Current D09/D10 addressing/continuity repairs again preserve packet payload/timing and full decoded output. None of 120 maintained moofs match the researched 104-byte one-sample patch shape; no post-FFmpeg patch pass or new generic muxer is enabled.

[Maintained implementation](../../../docs/PRODUCTION-PIPELINE.md) · [Current qualification and tradeoffs](../../shared/runs/20260921T203100Z-production-pipeline/analysis.md). Release not published.

## Retained earlier research evidence


Full identity: `R162.compile-a-qualified-mux-configuration-into-a-small-patch-program`.

Current scoped decision: **already_implemented**.

D09/D10: actual current remux accepts absolute-addressed and missing-tfdt sources and emits byte-identical packet payloads and full decoded output. No additional imported repair adapter is needed for this profile. Prior patch-program cost evidence remains in history.

Next action: Retain these as remux regression inputs; reopen only for a demonstrated unsupported addressing/continuity profile.

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

**D09 — executed_existing_owner_or_control**: The maintained remuxer already repairs relative output addressing for this absolute-addressed source; all packets and full decoded output match.

**D10 — executed_existing_owner_or_control**: The maintained demux/mux owner already accepts the authored missing-tfdt continuity profile; all packets and decoded output match.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **already_implemented**. D09/D10: actual current remux accepts absolute-addressed and missing-tfdt sources and emits byte-identical packet payloads and full decoded output. No additional imported repair adapter is needed for this profile. Prior patch-program cost evidence remains in history.

Next action: Retain these as remux regression inputs; reopen only for a demonstrated unsupported addressing/continuity profile.

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

Full identity: `R162.compile-a-qualified-mux-configuration-into-a-small-patch-program`.

Earlier decision: **pursue** (actual-complete-cost-comparison).

Qualifiedfixedmoofpatchconstructor versusdirectboundedboxconstructor,200movies/4800fragmentsperjob,11pairs includingcoldtemplateparsing/compilation andoutputhashing. Everyoutputbyteexact existingqualifiedfixture; priorfullhostdecodedpixel/packet/timing andadversecontrols retained. Median23.00percent saving95[21.91,24.01] passes5percentgate. 104byte template retention; hostPython only, not arbitraryrecipes/Wasm/browserCPU.

Earlier next action: Scopedresearch costdecision complete; broaden only for a materially differentowner/workload withnewdeclaredgate.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Fixed moof patch program reproduces24single-sample packet payload/timing and complete decoded pixels; mutated skeleton/zero duration reject. Pure qualified constructor, arbitrary layout excluded. |
| performance | passed | Qualifiedfixedmoofpatchconstructor versusdirectboundedboxconstructor,200movies/4800fragmentsperjob,11pairs includingcoldtemplateparsing/compilation andoutputhashing. Everyoutputbyteexact existingqualifiedfixture; priorfullhostdecodedpixel/packet/timing andadversecontrols retained. Median23.00percent saving95[21.91,24.01] passes5percentgate. 104byte template retention; hostPython only, not arbitraryrecipes/Wasm/browserCPU. |
| results | passed | Qualifiedfixedmoofpatchconstructor versusdirectboundedboxconstructor,200movies/4800fragmentsperjob,11pairs includingcoldtemplateparsing/compilation andoutputhashing. Everyoutputbyteexact existingqualifiedfixture; priorfullhostdecodedpixel/packet/timing andadversecontrols retained. Median23.00percent saving95[21.91,24.01] passes5percentgate. 104byte template retention; hostPython only, not arbitraryrecipes/Wasm/browserCPU. |
| decision | passed | Qualifiedfixedmoofpatchconstructor versusdirectboundedboxconstructor,200movies/4800fragmentsperjob,11pairs includingcoldtemplateparsing/compilation andoutputhashing. Everyoutputbyteexact existingqualifiedfixture; priorfullhostdecodedpixel/packet/timing andadversecontrols retained. Median23.00percent saving95[21.91,24.01] passes5percentgate. 104byte template retention; hostPython only, not arbitraryrecipes/Wasm/browserCPU. |

[New run](../../shared/runs/20260919T214500Z-owned-and-patch-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D09 — Make existing fragments relocatable by repairing their address metadata**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch02_D08-D13/demuxe_batch2/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D10 — Synthesize missing decode-time headers from proven continuity**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch02_D08-D13/demuxe_batch2/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
