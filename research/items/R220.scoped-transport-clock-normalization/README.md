<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# scoped transport-clock normalization

Current decision: **already_implemented**. Authored raw PES/PCR rollover across33-bit boundary already unwraps consistently through demux; selected packet payload and A/V offsets preserved. Existing RemuxPlayer plays/seeks with exact host decoded pixels/PCM. Bounded late-reorder policy and large-jump refusal pass; no second normalizer should be inserted after authoritative demux.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Authored33bitPES/PCR rollover preserves payload and commonPTS/DTS/A/V offsets through existingdemux; exact hostpixels/PCM plus maintainedRemuxPlayer seek/play and cleanup. Late reorder andlarge-jump controls pass. |
| performance | not_applicable | Already handled tested profile: do not introduce a second post-demux normalizer. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D50 — Reduce an epoch while timestamps are still integers**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch10_D48-D51/demuxe_batch10/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D50 — deferred_profile_followup**: Use only a regression at a demonstrated integer-to-browser-time boundary. Existing rollover normalization remains; do not add a second unconditional post-demux normalizer.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
