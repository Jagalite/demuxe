<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use verbatim FLAC as a lightweight integer-PCM carrier

Full key: `R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier`

Current decision: **stop_current_profile** (2026-09-19T22:22:43.500827+00:00).

Authored48kmono/stereo S16verbatim FLAC preserves all96000samples exactly in independent host and Chromeinteger recovery. Native2sforward/backwardseek→EOF and completeoffline render/lifecycle pass. Independentflac-t caught initial fixed-blockSTREAMINFO nominalsize error; invalid outputs retained, correctedmin/max4096 verifies without numberingwarnings. Truncation/CRC controls pass; MD5explicitunknownzeros. Five alternating formatter+decode vs same4096blockordinaryFLAClevel0/5:mono158.579ms vs58.788ms best (2.69748),stereo290.033ms vs58.644ms (4.94561), bothfail1.10. Verbatim192306/384330bytes vs level0 40195/74450 andlevel5 36944/65258.

Stop current Python arbitrary-bit accumulator formatter costprofile. Integercarrier feasibility is correct; nofloat quantization allowed. Reopen with bounded native/Wasm vectorizedformatter and fullframe/checksum/seek controls, measuring actual wholeendpoint and bytes against sameblocklevel0/5. Do notinfer simpleformat means fasterencoding.

Shared immutable component run; no production qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T222243Z-flac-bits/run.json) · [Analysis](../../shared/runs/20260919T222243Z-flac-bits/analysis.md) · [Manifest](../../shared/runs/20260919T222243Z-flac-bits/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
