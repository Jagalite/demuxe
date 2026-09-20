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
