<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# upload operation selected by existing layout

Disposition: **inconclusive**. correctness: **passed**, performance: **failed**.

Actual30prepared1280x7208bit plane uploads with1344stride and254padding sentinel, WebGL2 UNPACK_ROW_LENGTH versus reusabletightbuffer CPUrowpack. Full finalRGBA independently exact; badstride guard and pixelstore restoration pass, context/resourcesdestroy. Candidate application rowcopy0 versus27648000baselinebytes, same27648000uploadbytes; no driver zerocopy claim. Nine alternating coldcontext/pipeline/30upload/draw/finalreadback/check/teardown tasks: saving8.01%, bootstrap95[-0.22614207120079666, 15.24866415107513]; lower95does not meet declared10%gate. No demonstrated speed benefit despite copycount reduction. Singleplane layout profile, no color/HDR/generalplayer admission.

Next: Research experiment complete without established task latency benefit. Reopen with a specified representative plane/texture workload and new predeclared value threshold; integration remains separate.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T210558Z-stride/analysis.md)
