<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Develop Ultra HDR gain maps after native image decoding

Full identity: `R302.develop-ultra-hdr-gain-maps-after-native-image-decoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current YUV branch excludes PQ/HLG and supplies no Ultra HDR component parser or gain-map reconstruction oracle. Historical lack of WebGPU is obsolete in the shared probe; pinned libultrahdr and component-value fidelity still need a real setup inventory. No current missing-install claim is inferred from the old host.

Next action: Provision/identify one pinned libultrahdr reference and compare identical arrays for one grayscale map before browser decode/shader integration.

## Definition and contract

Type: Existing-image capability; source-specific extension of split reconstruction ownership. Use a small parser to extract a qualified Ultra HDR image's compressed base, compressed gain map, and metadata. Decode the component images with browser image decoding, then apply gain-map reconstruction in a GPU stage. Retain the decoded components so changing the declared output HDR capacity does not repeat JPEG decoding. Libultrahdr exposes a probe that parses information without decompressing the images, accessors for both compressed images and gain-map metadata, and an output-display-capacity parameter. Its reference implementation performs metadata-dependent gain reconstruction, including gamma, offsets, and gain-map weighting. [U1–U3]

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
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md)
