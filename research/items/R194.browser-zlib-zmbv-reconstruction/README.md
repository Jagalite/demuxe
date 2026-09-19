<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# browser zlib + ZMBV reconstruction

Full identity: `R194.browser-zlib-zmbv-reconstruction`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Persistent browser DecompressionStream plus strict ZMBV32 motion/XOR reconstruction matches all eight host reference frames. Cold dependent frame rejects. Bounded 32x32 CPU component; other pixel formats and GPU presentation not claimed.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

A real 64×64 BGR0 ZMBV stream contains four controlled frames: a keyframe, an unchanged frame, a moved-block frame and a changed-block frame. Packet sizes are [65, 10, 63, 59]; corresponding inflated payload sizes are [16384, 32, 5152, 4128]. One persistent browser DecompressionStream('deflate') received the real compressed bytes frame by frame. Without closing the stream, it emitted the exact payload at each Z_SYNC_FLUSH boundary. A CPU implementation of ZMBV motion copying and XOR residual application reconstructs the complete sequence byte-for-byte to FFmpeg (eaf06b60ccbaf2a32d28da9364d6fc8143b4fcdd48f070035108daaa54bd648a). The proposed GPU copy/XOR stage remains untested because browser GPU APIs are unavailable. The component result is that browser-owned zlib satisfies ZMBV's incremental stateful inflation requirement in this Chromium build.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R194.browser-zlib-zmbv-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R194.browser-zlib-zmbv-reconstruction.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R194.browser-zlib-zmbv-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R194.browser-zlib-zmbv-reconstruction.md)
- [results/top100/gpu/zmbv-result.json](../../../results/top100/gpu/zmbv-result.json)
