<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# VP9 WebM cluster surgery

Current decision: **stop_current_profile**. Packet-copy VP9 Cluster surgery is faithful:1→8 clusters, all120 packets and decoded host frames unchanged, no new keyframes, only74B larger. Every candidate browser picture matches the independent full-source native oracle. But the long-Cluster baseline already emits pictures before its tail is available; there is no demonstrated complete-Cluster withholding to remove. Stop this incremental-delivery optimization profile. A baseline callback/canvas sampling artifact invalidates positive timing qualification; it is not candidate corruption.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Packet-copy VP9 Cluster surgery is faithful:1→8 clusters, all120 packets and decoded host frames unchanged, no new keyframes, only74B larger. Every candidate browser picture matches the independent full-source native oracle. But the long-Cluster baseline already emits pictures before its tail is available; there is no demonstrated complete-Cluster withholding to remove. Stop this incremental-delivery optimization profile. A baseline callback/canvas sampling artifact invalidates positive timing qualification; it is not candidate corruption. |
| correctness | passed | All120 source/candidate packet and host decoded frame records exact. Independent settled whole-source browser oracle and all candidate continuous pictures exact; source-generation stale tail rejected and owners closed. Splitting does not create RAPs. One baseline callback samples following picture at metadata0; recorded separately as instrumentation limitation. |
| performance | not_applicable | No measured opportunity: all11 long-Cluster owners already release pictures before the450ms tail. Exploratory first-frame difference median1.25ms, range[-10.25,17.27], never reaches20ms target; one baseline sample violates timestamp/picture pairing, so this is not accepted positive performance evidence. Subsequent performance qualification is not applicable after scoped no-opportunity stop. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Packet-copy VP9 Cluster surgery is faithful:1→8 clusters, all120 packets and decoded host frames unchanged, no new keyframes, only74B larger. Every candidate browser picture matches the independent full-source native oracle. But the long-Cluster baseline already emits pictures before its tail is available; there is no demonstrated complete-Cluster withholding to remove. Stop this incremental-delivery optimization profile. A baseline callback/canvas sampling artifact invalidates positive timing qualification; it is not candidate corruption. |

Next/reopen: Reopen only when a real producer or intermediary demonstrably withholds an entire long Cluster despite complete useful blocks; do not treat arbitrary whole-Cluster waiting as the cheapest baseline.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
