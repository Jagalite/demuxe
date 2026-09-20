<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Render bitmap subtitles without burning them into video

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Restricted complete-object/literal PGS browser overlay now exact at0.499999,0.500000,0.500001,1.499999,1.500000,1.500001seconds plus rewind. Independent FFprobe subtitle decoder events give500000us display and1500000us clear; independently FFmpeg-rasterized stable bitmap states provide pixel oracle. This decomposes event timing from FFmpeg overlay video-frame scheduling without relaxing exact pixel/timing thresholds; original boundary-oracle failure is retained. Transparent canvas is a separate DOM owner over unchanged native blackvideo. Truncatedsegment rejects, sourcechange clears overlay, stalegeneration refuses publication, newgeneration recovers, URL/canvas/video cleanup executes. Initial loadeddata observation was not a ready opaque picture; corrected native observation by seeking static blackvideo to0.125s, preserving subtitle boundary times. GeneralRLE, fragmentedobjects, coloredpalettes and production integration remain outside profile. This capability gate asserts no performance benefit; benchmark not applicable.

Next: Scoped subtitle capability research gates complete. Integrate only with declared supported PGSchunks/palette semantics and actual production overlay lifecycle; any performance claim requires a separate equivalent-output workload.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T210825Z-event-oracle/analysis.md)

[Fixture provenance metadata amendment](../../shared/runs/20260919T211636Z-presentation-provenance-amendment/analysis.md); output and gate decisions unchanged.
