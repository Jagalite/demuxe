<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode one Vorbis stream in parallel using small overlapping boundaries

Full key: `R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries`

Current decision: **stop_current_profile** (2026-09-20T00:08:53.289619+00:00).

Actual four concurrently launched host Vorbis packet-range decoders each retain identification/comment/setup and one preceding overlap packet; regenerated Ogg page granules preserve final512sample trim. All192000stereo frames including every seam equal continuous host decode exactly; each omitted-preroll control differs. Four workers complete and are reaped. Five alternating complete cold source/hash/CRC/repage/write/decode/transfer/join81.536ms versus continuous33.130ms ratio2.46110 fails0.9. Fixture uses long blocks; short/long transition generality is excluded.

Stop this short-asset subprocess parallel Vorbis profile on complete cost. Longer assets, persistent workers and qualified short/long transitions require a new contract and measured gate. No browser/Wasm parallel decoder integration or generic one-packet proof.

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

[Run](../../shared/runs/20260920T000853Z-vorbis-parallel/run.json) · [Analysis](../../shared/runs/20260920T000853Z-vorbis-parallel/analysis.md) · [Manifest](../../shared/runs/20260920T000853Z-vorbis-parallel/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D47 — Bounded Vorbis views across short/long blocks**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch09_D44-D47/demuxe_batch9/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D47 — deferred_profile_followup**: Defer bounded Vorbis previews until there is an explicit sample-window consumer and a complete indexing/setup/retention comparison; preserve persistent-decoder baseline.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
