<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prepared non-keyframe representation switches using AV1 S-frames

Full identity: `R137.prepared-non-keyframe-representation-switches-using-av1-s-frames`.

Current decision: **stop_current_profile** (actual_host_and_browser_component).

Authored actual AV1 S-frame at CQ24-to40 boundary after four identical shared-history pictures. Full12-picture host and Chrome output is exact, and wrong-history/cold-reset controls fail as required. Ordinary inter continuation with the same prepared history is also exact and uses3531 rather than3598 coded bytes. No added switch opportunity in this fixed-configuration profile; stop here without a speed claim. This is not a claim about arbitrary history, resolution changes or general S-frame usefulness.

Next action: Reopen with a representation difference requiring an S-frame and a prepared compatible shared history, not a cold-start substitution.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Built authored libaom S-frame and ordinary inter matched-history pairs. |
| screen | passed | Actual frame_type3 verified, ordinary matched-history switch already exact. |
| correctness | passed | Full12 pictures/PTS host and Chrome exact. Wrong history gives mismatch or decode error; cold delta rejected and every output closed. |
| performance | not_applicable | Scoped no additional switching opportunity versus ordinary inter continuation; no cost-benefit claim. |
| results | passed | Authored actual AV1 S-frame at CQ24-to40 boundary after four identical shared-history pictures. Full12-picture host and Chrome output is exact, and wrong-history/cold-reset controls fail as required. Ordinary inter continuation with the same prepared history is also exact and uses3531 rather than3598 coded bytes. No added switch opportunity in this fixed-configuration profile; stop here without a speed claim. This is not a claim about arbitrary history, resolution changes or general S-frame usefulness. |
| decision | passed | Authored actual AV1 S-frame at CQ24-to40 boundary after four identical shared-history pictures. Full12-picture host and Chrome output is exact, and wrong-history/cold-reset controls fail as required. Ordinary inter continuation with the same prepared history is also exact and uses3531 rather than3598 coded bytes. No added switch opportunity in this fixed-configuration profile; stop here without a speed claim. This is not a claim about arbitrary history, resolution changes or general S-frame usefulness. |

[New run](../../shared/runs/20260919T232812Z-av1-sframe/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
