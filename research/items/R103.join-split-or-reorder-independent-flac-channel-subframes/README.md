<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Join, split or reorder independent FLAC channel subframes

Full key: `R103.join-split-or-reorder-independent-flac-channel-subframes`

Current decision: **pursue** (2026-09-19T22:22:43.500827+00:00).

Actualindependent fourchannel20bit FLAC uses257sample verbatim subframes,5148bits each (non-byte-aligned). Bitrange select3,1 and synchronizedtwo-mono assembly preserve codedsubframe bits; every hostS32 and Chrome normalizedfloat equals exact sourcechannelreference. Duplicateintent, mismatchedsampleposition/block, dependentchannel, CRC/truncation controls reject. Five alternating coldparse/select/write+decode pairs27.756ms versus56.637ms normaldecode-pan-reencode+sameconsumer, ratio0.49007 passes0.9.

Pursue restricted independent20bitverbatim channel bitcopy/assembly at proved identicalblock/samplepositions. No genericRice/LPC parsing or dependentstereo support, no sample reconstitution in candidate. Cost is tiny cold host subprocess endpoint; throughput/browser CPU savings notestablished. No productionadmission.

Shared immutable component run; no production qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T222243Z-flac-bits/run.json) · [Analysis](../../shared/runs/20260919T222243Z-flac-bits/analysis.md) · [Manifest](../../shared/runs/20260919T222243Z-flac-bits/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
