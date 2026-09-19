<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract an MVC base view for explicitly requested 2D playback

Current decision: **pursue**. Genuine MVC fixture resolves the previous missing-media gate.468 dependent-view MVC extension slices identify view1 and subset SPS profile128. Custom TS/PES base extraction matches independent FFmpeg elementary bytes and all39 complete decoded picture hashes.39 explicit PES timestamp pairs match reference frame boundaries; FFmpeg produces78 field packets. Dependent view rejects and decodes zero standalone frames.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Genuine MVC source downloaded and independently inspected; source rights NOASSERTION; hashed source and39-picture reference registered. |
| screen | passed | Genuine MVC fixture resolves the previous missing-media gate.468 dependent-view MVC extension slices identify view1 and subset SPS profile128. Custom TS/PES base extraction matches independent FFmpeg elementary bytes and all39 complete decoded picture hashes.39 explicit PES timestamp pairs match reference frame boundaries; FFmpeg produces78 field packets. Dependent view rejects and decodes zero standalone frames. |
| correctness | passed | Passed scoped finite AVC-base extraction: independent demux bytes and39 decoded pictures exact, all39 explicit PES timing pairs match source frame boundaries, genuine dependent view rejects. Browser container/destination/lifecycle remains unqualified. |
| performance | pending | No equivalent-work performance benchmark; browser destination and actual route correctness still pending. |
| results | passed | Preserved initial field-versus-frame timing assertion failure and corrected explicit mapping run with manifests. |
| decision | passed | Pursue AVC base extraction component; prior fixture blocker resolved, destination qualification remains pending. |

Next: Qualify a browser/Wasm destination for this interlaced base, truthful container initialization/timing, source change/cancel/seek, and more MVC layouts before integration. Do not infer stereo or arbitrary dependent-view support.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

[Source archive](https://samples.ffmpeg.org/3D/) and [source media](https://samples.ffmpeg.org/3D/999.MTS). Source/derived media license NOASSERTION; local research only, no redistribution grant.
