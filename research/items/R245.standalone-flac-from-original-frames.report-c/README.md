<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# standalone FLAC from original frames

Full key: `R245.standalone-flac-from-original-frames.report-c`

Current decision: **pursue** (2026-09-19T22:23:12.889048+00:00).

Actual6s48kstereoFLAC originalframes20–22 copyunchanged into0.256s12288sample microfile. Correcttotal and exactboundedPCM MD5; allframehashesunchanged, flac-t succeeds, corruptionrejects. Host and everyChrome native/reference/render float sample exactly match source81920:94208. Five alternating complete coldindex/copy/boundedchecksumdecode+consumerdecode pairs91.199ms versus106.204ms fulldecode/crop/ordinaryFLACencode+consumerdecode, ratio0.85872 passes0.9. Separate randomskip withinencodedmicrofile fails libFLAC SEEK_ERROR atnonzeroindices dueabsoluteoriginal frame numbers; do notcall it portable seekablefile.

Pursue narrow whole-file decodeAudioData/finiteclip consumption endpoint only, with exactmetadata/MD5 costcharged. Encodedmicrofile native randomseek remains failed; byte-identicalframes cannot silently be renumbered. No productionadmission or genericstandalone-seekability claim. Reopen broaderfilecontract with explicitheader-rebase variant and independentseek oracle.

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

[Run](../../shared/runs/20260919T222312Z-flac-microstreams/run.json) · [Analysis](../../shared/runs/20260919T222312Z-flac-microstreams/analysis.md) · [Manifest](../../shared/runs/20260919T222312Z-flac-microstreams/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
