<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# progressively refine one preview

Full identity: `R185.progressively-refine-one-preview`.

Current decision: **stop_current_profile** (actual-route screen).

Actual fresh image-element owner displayed a provisional progressive JPEG but did not refine between two partial releases: both RGB errors34.71918/255. Final compositor differs from independent completed-source reference in94channels by1 (mean0.00015937); strict exact-final gate failed. Replacement image is exact; incomplete transport cancellation and stale-owner rejection pass. Initial same-element run accidentally retained the prior complete image and is explicitly invalid as preview evidence. Scoped negative, not missing setup or universal rejection of progressive JPEG.

Next action: Research profile concluded at visual failure. Reopen only with demonstrated refinement and exact final fidelity under a declared revised profile.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Owned512x384 ten-scan162844-byte JPEG, fresh browser owner, independent completed reference, compositor screenshots and source/cancel controls executed. |
| screen | passed | Owned512x384 ten-scan162844-byte JPEG, fresh browser owner, independent completed reference, compositor screenshots and source/cancel controls executed. |
| correctness | failed | Actual fresh image-element owner displayed a provisional progressive JPEG but did not refine between two partial releases: both RGB errors34.71918/255. Final compositor differs from independent completed-source reference in94channels by1 (mean0.00015937); strict exact-final gate failed. Replacement image is exact; incomplete transport cancellation and stale-owner rejection pass. Initial same-element run accidentally retained the prior complete image and is explicitly invalid as preview evidence. Scoped negative, not missing setup or universal rejection of progressive JPEG. |
| performance | not_applicable | Required refinement and strict final-fidelity gate failed; staged artificial delivery is not performance evidence. |
| results | passed | Actual fresh image-element owner displayed a provisional progressive JPEG but did not refine between two partial releases: both RGB errors34.71918/255. Final compositor differs from independent completed-source reference in94channels by1 (mean0.00015937); strict exact-final gate failed. Replacement image is exact; incomplete transport cancellation and stale-owner rejection pass. Initial same-element run accidentally retained the prior complete image and is explicitly invalid as preview evidence. Scoped negative, not missing setup or universal rejection of progressive JPEG. |
| decision | passed | Actual fresh image-element owner displayed a provisional progressive JPEG but did not refine between two partial releases: both RGB errors34.71918/255. Final compositor differs from independent completed-source reference in94channels by1 (mean0.00015937); strict exact-final gate failed. Replacement image is exact; incomplete transport cancellation and stale-owner rejection pass. Initial same-element run accidentally retained the prior complete image and is explicitly invalid as preview evidence. Scoped negative, not missing setup or universal rejection of progressive JPEG. |

[New run](../../shared/runs/20260920T003053Z-progressive-owner-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

## Imported preview research supplement

[20260921T123810Z-preview-research-import](../../shared/runs/20260921T123810Z-preview-research-import/REPORT.md): Native progressive JPEG state reuse yields exact final pixels with extra total work. This does not overturn the existing browser compositor refinement/final-fidelity failure. Imported evidence only; current decision and stages remain unchanged.
