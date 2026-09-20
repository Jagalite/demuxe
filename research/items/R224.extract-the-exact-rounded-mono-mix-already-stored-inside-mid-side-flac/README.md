<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract the exact rounded mono mix already stored inside mid-side FLAC

Full key: `R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac`

Current decision: **stop_current_profile** (2026-09-19T22:53:03.260074+00:00).

Actual authored signed16 FLAC all-mid-side fixed0 escape-residual blocks: extract whole coded mid subframes unchanged and author mono headers/STREAMINFO/CRCs. All3084 integer samples equal floor((L+R)/2), including negative odd sums and opposite extrema. Host FFmpeg and native Chrome output exactly match independently decoded/integer-mixed/ordinarily-encoded reference; native render/end/closed and independent flac-t pass. Mixed channel assignment, corruptCRC and truncated frame reject. Initial browser oracle wrongly assumed uniform32768 normalization; preserved diagnostic shows positive32767/negative32768 native normalization, final independent same-consumer oracle resolves all1507 false mismatches. Five alternating complete read/parse/write/decode vs full source decode/integer-mix:31.293ms vs28.988ms ratio1.07952 fails<=0.9.

Stop this tiny cold Python coded-mid extraction cost profile. Exact rounded integer mono capability is demonstrated only for the explicitly requested averaging semantics and all-mid-side fixed0 escape-residual fixture. Generic Rice/LPC, changing channel modes, and different averaging rules need separately admitted parsers/oracles. Unknown STREAMINFO MD5 remains explicit; no production changes.

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

[Run](../../shared/runs/20260919T225303Z-flac-mid/run.json) · [Analysis](../../shared/runs/20260919T225303Z-flac-mid/analysis.md) · [Manifest](../../shared/runs/20260919T225303Z-flac-mid/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
