<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AVIF image payloads as timed AV1 video, and eligible AV1 frames as AVIF

Full identity: `R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current packet-copy mux can preserve admitted AV1 packets but does not extract AVIF items or author timed image sequences. The report narrows compatibility to single-item, matching sequence configuration; grids/auxiliary images need separate handling.

Next action: Parse one compatible three-image AVIF set and compare packet hashes through host mux plus current native playback before any public image-sequence route.

## Definition and contract

Question. Can images become a native timed presentation, and keyframes become images, without a pixel decode/re-encode step? What differs from earlier work. Distinct from MJPEG image decoding and texture video: reuse AV1 coded image data across still-image and timed-media containers. Input scope. Start with simple single-item AVIFs with matching dimensions, profile, bit depth, color and compatible identical sequence configuration; no grids or auxiliary images. Mechanism to test. Extract the AV1 image payload and configuration, author timed AV1 video samples, and preserve the compressed image data. Test the reverse direction for independently decodable AV1 frames. Smallest experiment. 1. Generate a small compatible AVIF set and audit sequence-header/still-picture flags. 2. Mux the extracted payloads into an ordinary MP4 video track and then an MSE profile separately. 3. Extract eligible independent AV1 video frames into AVIF and compare image decoding against the video reference.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md)
