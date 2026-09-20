<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Incremental MJPEG stripe decode/upload

Disposition: **inconclusive**. correctness: **passed**, performance: **failed**.

Built a real native libjpeg64-row callback producer and browser streaming texture owner for2048x2048 genuineJPEG. First diagnostic stripe GPUupload completed before the producer decoded its finalscanlines (independent epoch clocks), and all nine timed candidate firstuploads were submitted while decoding continued. No artificial producer delay. Complete WebGL2 texture RGBA exactly matches separate djpeg CLI reference; decoder implementation is intentionallysame, so this proves pipeline identity rather than decoder substitution. Partialtexture differs and publicationguard rejects beforecomplete; canceledstream retires unpublishedresources, malformedJPEG fails, freshowner afterwards remains exact. Baseline buffersfullRGB anduploads once throughsameprocess/HTTP/GPUobserver stack. Nine alternating wholecoldtask pairs charge childlaunch/sourceopen/decode/streamassembly/upload/draw/fullreadback/hash/cleanup: baseline259.378ms, candidate323.889ms, saving-24.87%,95%[-59.40233580625463, 1.5762304588429532], fails10%lower-boundgate. Native RGBscratch is393216B vs12582912B, a measured allocationbound notwholeprocessmemory. Actual overlap does not imply userbenefit; this implementation is slower/variable. Physical GPU attribution, currentWasm callback integration, sourcecapture timing and energy remainunclaimed.

Next: Reopen only with a materially cheaper existing decoder-to-texture callback/transport path or a representative workload that can beat complete-frame control. Keep unpublished texture and completion/cancellation fence. Do not treat firststripe latency alone as end-to-end win.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T221857Z-overlap/analysis.md)

[Fixture provenance metadata amendment](../../shared/runs/20260919T222740Z-presentation-provenance-amendment/analysis.md); output and gate decisions unchanged.
