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

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D23 — Select independent FLAC channels without decoding their samples**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch04_D21-D25/demuxe_batch4/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
