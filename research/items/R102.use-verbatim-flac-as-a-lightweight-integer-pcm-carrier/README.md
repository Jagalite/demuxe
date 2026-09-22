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

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D16 — A true simple FLAC carrier: feasible, not automatically cheaper**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch03_D14-D20/demuxe_batch3/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D16 — retain_scoped_stop**: Retain the stopped unconditional verbatim-FLAC adoption. This screen does not beat the maintained encoder on complete cost.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).
