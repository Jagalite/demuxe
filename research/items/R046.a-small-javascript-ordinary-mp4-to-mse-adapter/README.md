<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# A small JavaScript ordinary-MP4-to-MSE adapter

Full identity: `R046.a-small-javascript-ordinary-mp4-to-mse-adapter`.

Current decision: **stop_current_profile** (actual-host-complete-cost-comparison).

ColdNode ordinaryMP4adapter fullprepare/output+hostdecode compared toFFmpegcopy-fragmentdelaymoov+hostdecode; alloriginalpictures/PCM exact, current72video142audio sampletableprofile. Hostprocessstartup charged, notbrowserwarmJS/Wasm. 11pairedjobs median saving-37.27percent95[-47.19,-30.33], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile.

Next action: Scopedcostdecision complete. Reopen onlyfor a materiallydifferent integratedowner/workload, withcorrectness andcost chargedagain.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Bounded ordinary MP4 adapter preserves 72 video and 142 audio packet payloads/timing, full decoded pixels/PCM exact; malformed input rejects. Actual generated MSE output has marked audio/video to EOF and cleanup. Accepted only tested sample-table profile. |
| correctness | passed | Bounded ordinary MP4 adapter preserves 72 video and 142 audio packet payloads/timing, full decoded pixels/PCM exact; malformed input rejects. Actual generated MSE output has marked audio/video to EOF and cleanup. Accepted only tested sample-table profile. |
| performance | failed | ColdNode ordinaryMP4adapter fullprepare/output+hostdecode compared toFFmpegcopy-fragmentdelaymoov+hostdecode; alloriginalpictures/PCM exact, current72video142audio sampletableprofile. Hostprocessstartup charged, notbrowserwarmJS/Wasm. 11pairedjobs median saving-37.27percent95[-47.19,-30.33], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile. |
| results | passed | ColdNode ordinaryMP4adapter fullprepare/output+hostdecode compared toFFmpegcopy-fragmentdelaymoov+hostdecode; alloriginalpictures/PCM exact, current72video142audio sampletableprofile. Hostprocessstartup charged, notbrowserwarmJS/Wasm. 11pairedjobs median saving-37.27percent95[-47.19,-30.33], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile. |
| decision | passed | ColdNode ordinaryMP4adapter fullprepare/output+hostdecode compared toFFmpegcopy-fragmentdelaymoov+hostdecode; alloriginalpictures/PCM exact, current72video142audio sampletableprofile. Hostprocessstartup charged, notbrowserwarmJS/Wasm. 11pairedjobs median saving-37.27percent95[-47.19,-30.33], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile. |

[New run](../../shared/runs/20260919T215000Z-extraction-cost-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
