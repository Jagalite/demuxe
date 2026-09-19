<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 aspect metadata with no VCL rewrite

Full identity: `R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current code preserves existing sample_aspect_ratio and retained display geometry. It does not expose a requested aspect-metadata editing/export operation; adding SPS/VUI and pasp patching would be a distinct semantic feature.

Next action: If explicit metadata correction is required, test one length-preserving avcC/pasp edit and all VCL/PTS hashes; altered SPS length or B-frame timestamps must reject or use a fully validated rewriter.

## Definition and contract

The earlier continuity run validated the SPS/VUI mechanism but rejected a temporary MP4→Annex-B→MP4 packaging route because it disturbed B-frame presentation timing. This rerun removes that artifact. The H.264 metadata bitstream filter first produces the 4:3 SPS. Because the SPS length is unchanged, the existing MP4 avcC SPS is patched in place, and the existing 16-byte pasp box is changed from 1:1 to 4:3. No media payload or box offsets move. The candidate keeps all 90 VCL NAL hashes, all 90 decoded-frame hashes, and every packet PTS/DTS/duration unchanged. Source and candidate are both 116,070 bytes. FFprobe reports SAR 4:3 / DAR 64:27, and Chromium reports 427×180 intrinsic display geometry while presenting all 90 frames with zero drops.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md)
