<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract in-band closed captions from compressed video headers

Full identity: `R060.extract-in-band-closed-captions-from-compressed-video-headers`.

Current decision: **stop_current_profile** (actual-host-complete-cost-comparison).

ColdPython AnnexeB/T35parity/text extraction vsFFmpegmovie+608SRT: sameauthored zero-timepop-onHI. Originalparitynegative/fullvideofidelity retained. No general608/708captionrenderer/seekstatereconstruction, onlyrestrictedextractioncomponent. 11pairedjobs median saving-28.08percent95[-32.79,-19.57], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile.

Next action: Scopedcostdecision complete. Reopen onlyfor a materiallydifferent integratedowner/workload, withcorrectness andcost chargedagain.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Authored H.264 registered A53 SEI yields restricted pop-on HI matching independent FFmpeg SRT; existing NAL bytes and all video pixels unchanged. Wrong parity rejects. Accepted extraction component, not CEA608/708 renderer or seek state restoration. |
| correctness | passed | Authored H.264 registered A53 SEI yields restricted pop-on HI matching independent FFmpeg SRT; existing NAL bytes and all video pixels unchanged. Wrong parity rejects. Accepted extraction component, not CEA608/708 renderer or seek state restoration. |
| performance | failed | ColdPython AnnexeB/T35parity/text extraction vsFFmpegmovie+608SRT: sameauthored zero-timepop-onHI. Originalparitynegative/fullvideofidelity retained. No general608/708captionrenderer/seekstatereconstruction, onlyrestrictedextractioncomponent. 11pairedjobs median saving-28.08percent95[-32.79,-19.57], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile. |
| results | passed | ColdPython AnnexeB/T35parity/text extraction vsFFmpegmovie+608SRT: sameauthored zero-timepop-onHI. Originalparitynegative/fullvideofidelity retained. No general608/708captionrenderer/seekstatereconstruction, onlyrestrictedextractioncomponent. 11pairedjobs median saving-28.08percent95[-32.79,-19.57], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile. |
| decision | passed | ColdPython AnnexeB/T35parity/text extraction vsFFmpegmovie+608SRT: sameauthored zero-timepop-onHI. Originalparitynegative/fullvideofidelity retained. No general608/708captionrenderer/seekstatereconstruction, onlyrestrictedextractioncomponent. 11pairedjobs median saving-28.08percent95[-32.79,-19.57], misseslower95>5percent gate. Measuredregression inthiscoldprocessprofile. |

[New run](../../shared/runs/20260919T215000Z-extraction-cost-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
