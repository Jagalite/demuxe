<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Guarded, format-specialized Wasm decoder variants

Full identity: `R145.guarded-format-specialized-wasm-decoder-variants`.

Current decision: **inconclusive** (actual_compiled_wasm_browser_component).

Built paired real Wasm AVC decoders with identical compiler/link settings; candidate removes CABAC execution behind progressive8bit420/CAVLC guards. Both decode all30 full frames and PTS exactly; an in-owner CABAC PPS change passes the ordinary decoder but candidate returns explicit rejection before publishing any changed-profile picture. Wasm bytes fall only0.4522%. Seven alternating fresh-browser load/start/decode jobs have median1.5326x candidate cost and very wide0.213–7.700x ratios under concurrent campaign load. No trustworthy gain demonstrated; retain inconclusive cost outcome, not a stable53% regression claim.

Next action: Do not integrate for performance; reopen only with a larger real restriction opportunity and controlled load/start/decode measurement. Keep every tool-change guard.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual paired Wasm runtime builds; matched compiler/link options and retained source dependency provenance. |
| screen | passed | Candidate CABAC branch removed, explicit progressive8bit420CAVLC guard executes. |
| correctness | passed | 30 full frames/PTS exact; live changed CABAC configuration returns-199 and emits0 changed pictures, baseline accepts30; owners closed. |
| performance | failed | Required gain not established:0.4522% smaller module, median1.5326x cost, very noisy0.213–7.700x range; inconclusive effect estimate. |
| results | passed | Built paired real Wasm AVC decoders with identical compiler/link settings; candidate removes CABAC execution behind progressive8bit420/CAVLC guards. Both decode all30 full frames and PTS exactly; an in-owner CABAC PPS change passes the ordinary decoder but candidate returns explicit rejection before publishing any changed-profile picture. Wasm bytes fall only0.4522%. Seven alternating fresh-browser load/start/decode jobs have median1.5326x candidate cost and very wide0.213–7.700x ratios under concurrent campaign load. No trustworthy gain demonstrated; retain inconclusive cost outcome, not a stable53% regression claim. |
| decision | passed | Built paired real Wasm AVC decoders with identical compiler/link settings; candidate removes CABAC execution behind progressive8bit420/CAVLC guards. Both decode all30 full frames and PTS exactly; an in-owner CABAC PPS change passes the ordinary decoder but candidate returns explicit rejection before publishing any changed-profile picture. Wasm bytes fall only0.4522%. Seven alternating fresh-browser load/start/decode jobs have median1.5326x candidate cost and very wide0.213–7.700x ratios under concurrent campaign load. No trustworthy gain demonstrated; retain inconclusive cost outcome, not a stable53% regression claim. |

[New run](../../shared/runs/20260919T234936Z-specialized-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
