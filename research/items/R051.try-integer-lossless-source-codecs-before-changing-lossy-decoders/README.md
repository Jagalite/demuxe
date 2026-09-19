<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Try integer-lossless source codecs before changing lossy decoders

Full identity: `R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

ALAC rejected by native media element and decodeAudioData, then isolated pinned ALAC Wasm decoder reproduced all 96000 stereo frames exactly with missing-extradata and truncated-packet rejection. Worth pursuing ALAC adaptation; TrueHD and complete route cost remain untested.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New input-profile feasibility study · P1 · PROPOSED / NOT TESTED Extends: R10, R11. Reference primitives: S7, S3, E1. Question. Do ALAC or ordinary TrueHD stereo provide a genuinely necessary, sample-preserving FLAC adaptation case without selecting a different fixed decoder? Mechanism. Use the normal decoder of an integer-lossless source, encode its established integer output as FLAC, and packet-copy compatible video. Start with ALAC; generated TrueHD is a separate second profile, not an Atmos/DTS-HD claim. Smallest useful experiment. Inventory confirms host encoders exist. Generate 16/24-bit stereo 48 kHz references with distinct channels and low-level bit patterns. First test original Native and packet-copy alternatives. Only if those cannot meet the request, validate reference PCM → source codec → decoded PCM → FLAC → decoded PCM, then test host-progressive MSE playback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md)
- [results/top100/audio/native-result.json](../../../results/top100/audio/native-result.json)
- [results/top100/environment.json](../../../results/top100/environment.json)
- [results/top100/lossless/result.json](../../../results/top100/lossless/result.json)
