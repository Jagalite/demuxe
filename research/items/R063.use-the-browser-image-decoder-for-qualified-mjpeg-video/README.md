<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use the browser image decoder for qualified MJPEG video

Full identity: `R063.use-the-browser-image-decoder-for-qualified-mjpeg-video`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The maintained bridge supports AVC/HEVC/VP8/VP9/AV1 WebCodecs configurations, not an MJPEG image-decoder promise adapter with mpv timing. createImageBitmap availability alone would repeat a known primitive. Genuine AVI1 table normalization, color/field/orientation and stale-result ownership are not implemented.

Next action: Scope self-contained JPEG followed by one genuine AVI1/default-table frame through a bounded image promise adapter; compare decoded geometry/color to a fixed oracle and close stale results after source replacement, without adding an independent audio clock.

## Definition and contract

New video-decoder adapter hypothesis · P2 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox compressed-image decode/presentation pilot; complete mpv-timed A/V integration is local-only. Related cards: R24. Proposed mechanism. For a supported Motion-JPEG subset, forward each compressed frame to createImageBitmap and present it with bounded ownership, instead of decoding JPEG in FFmpeg/Wasm. Apply only a necessary, verified MJPEG-to-JPEG header adapter. The potential gain is a different decoder implementation, not fewer decoded frames. What is new. Earlier alternative presenters started with already decoded pixels. This changes which decoder consumes the compressed video, using the image API rather than pretending WebCodecs or MSE supports the input.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md)
