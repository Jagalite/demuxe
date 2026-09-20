<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Legal source-authored avc3 SPS/PPS epochs change 360p→720p→360p without a second initialization. Independent complete image/seek and continuous-playback checks pass. The declared fresh-owner workload shows10.87% median savings with95% bootstrap interval6.80–17.52%; this is a bounded browser component result, not general HEVC or maintained-route qualification.

Correctness: Both fresh-init and in-band-only paths match all72 independent full-frame RGBA hashes/dimensions, five reverse/forward seek queries,71 continuous presented pictures, EOF and cleanup. Truthful same-profile AVC level3.1; actual SPS/PPS/IDR admission rejects a missing-configuration control before mutation. Delayed stale-generation publication is rejected before append. Unchanged AAC lane identity is observed but no PCM continuity claim; no hev1, open-GOP, arbitrary parameters or post-mutation rollback claim.

Performance: 11 predeclared alternating pairs;5% median saving gate passed at10.8734%, bootstrap95 median[6.7969,17.5184]%. Fresh MSE owner, byte slicing, append, three correct full-image seek queries and cleanup included; resident fixture/reference setup common and excluded. All timed images pass. Large first-pair and final-pair variance retained, no discarded samples.

Next/reopen: Bounded AVC component worth pursuing. Reopen for maintained integration or independently scoped hev1 source/destination; preserve exact configuration admission and qualify real source replacement/audio separately before production.

Bounded research result, not production or release admission.
