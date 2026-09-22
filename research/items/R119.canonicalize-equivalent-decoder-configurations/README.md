<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Canonicalize equivalent decoder configurations

Full identity: `R119.canonicalize-equivalent-decoder-configurations`.

Current scoped decision: **pursue**.

D01/D08: isolated AAC-LC metadata normalization preserves all packet payloads, full host PCM/YUV and checked browser frames. Both frozen-runtime seven-pair admission-cost gates pass. D03 two-byte AVC already works and is left unchanged.

Next action: Integrate only the qualified AAC declarations with strict guards and fallback; extend real-source/browser corpus before automatic admission.

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

**D01 — qualified_bounded_candidate**: Qualify the narrow AAC-LC PCE normalizer; compressed packets and full host/browser output remain exact.

**D03 — executed_existing_owner_or_control**: The maintained remuxer already plays the two-byte AVC length profile. Do not add a blanket prefix-widening pass.

**D08 — qualified_bounded_candidate**: Qualify exact-table explicit AAC sample-rate normalization; non-table rates and unsupported extensions remain rejected.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. D01/D08: isolated AAC-LC metadata normalization preserves all packet payloads, full host PCM/YUV and checked browser frames. Both frozen-runtime seven-pair admission-cost gates pass. D03 two-byte AVC already works and is left unchanged.

Next action: Integrate only the qualified AAC declarations with strict guards and fallback; extend real-source/browser corpus before automatic admission.

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

Full identity: `R119.canonicalize-equivalent-decoder-configurations`.

Earlier decision: **inconclusive** (actual-browser-complete-cost-comparison).

11paired20GOP browserjobs, allhostreference picturehashes andPTS exact. Canonical exactduplicateSPS/PPS parsing, boundschecks, serialization and comparison charged on everyjob;configurecalls20to1. Completecold decoder/hash/flush/close costsaving5.71percent95CI[2.36,12.57], misses lower95>5percent gate. No arbitrary semantic SPS equivalence or source-reset suppression. Earlier pre-canonicalized diagnostic excludes preprocessing and is not performance acceptance.

Earlier next action: Scoped cost decision complete; reopen only for materially different measuredconfiguration exposure, not repeated sampling to chase significance.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Exact duplicate SPS/PPS bytes canonicalize69→38description bytes; two48-frame browser decodes match independent pixels/timestamps; same-ID changed SPS rejects and cleanup recorded. Only byte-identical duplicates. |
| performance | failed | 11paired20GOP browserjobs, allhostreference picturehashes andPTS exact. Canonical exactduplicateSPS/PPS parsing, boundschecks, serialization and comparison charged on everyjob;configurecalls20to1. Completecold decoder/hash/flush/close costsaving5.71percent95CI[2.36,12.57], misses lower95>5percent gate. No arbitrary semantic SPS equivalence or source-reset suppression. Earlier pre-canonicalized diagnostic excludes preprocessing and is not performance acceptance. |
| results | passed | 11paired20GOP browserjobs, allhostreference picturehashes andPTS exact. Canonical exactduplicateSPS/PPS parsing, boundschecks, serialization and comparison charged on everyjob;configurecalls20to1. Completecold decoder/hash/flush/close costsaving5.71percent95CI[2.36,12.57], misses lower95>5percent gate. No arbitrary semantic SPS equivalence or source-reset suppression. Earlier pre-canonicalized diagnostic excludes preprocessing and is not performance acceptance. |
| decision | passed | 11paired20GOP browserjobs, allhostreference picturehashes andPTS exact. Canonical exactduplicateSPS/PPS parsing, boundschecks, serialization and comparison charged on everyjob;configurecalls20to1. Completecold decoder/hash/flush/close costsaving5.71percent95CI[2.36,12.57], misses lower95>5percent gate. No arbitrary semantic SPS equivalence or source-reset suppression. Earlier pre-canonicalized diagnostic excludes preprocessing and is not performance acceptance. |

[New run](../../shared/runs/20260919T213600Z-config-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D01 — AAC Program Config Element normalization**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch01_D01-D07/demuxe_native_screen/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D03 — Do not widen AVC length prefixes without a demonstrated need**: stop/negative. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch01_D01-D07/demuxe_native_screen/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).
- **D08 — Canonicalize an exactly representable explicit AAC sample rate**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch02_D08-D13/demuxe_batch2/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
