<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Replace polling chains with bounded credits and deadlines

Full identity: `R026.replace-polling-chains-with-bounded-credits-and-deadlines`.

Current decision: **stop_current_profile** (scoped_whole_player_paired_comparison).

Five paired actual-player comparisons completed after matching marked-output correctness. Primary pausedCPU gate failed; median paired deltas: {"activeCPU": 4.6825960985654955, "mediaBytes": 0, "pausedCPU": 8.464734995084804, "slowCPU": -1.275557688668689, "slowRSS": 0.11046122086811655, "startupSeekMs": 3.489075760126166} percent. Minimum absolute saving 0.1, measured -0.47193814139830437. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope.

Next action: Reopen only for an identified workload where the complete-player primary benefit can exceed the declared cost gate; retain component evidence.

Transport byte counts in the local whole-player run are server ReadStream bytes; they can include buffered or abandoned bytes and are not exact client-received or wire-byte measurements.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Pause tick count drops 24→1 in equal 1.2-second observation; play/seek wake, source identity rejection and cleanup pass. Complete independent presentation output and delayed-wake/deadline stress are not recorded; work count is not CPU qualification. |
| correctness | passed | Matching exact-asset headed marked picture/audio, seek,rate,pause,EOF and cleanup checks; runtime measurements retain route/progression/drop/error/cleanup assertions. |
| performance | failed | Five paired actual-player comparisons completed after matching marked-output correctness. Primary pausedCPU gate failed; median paired deltas: {"activeCPU": 4.6825960985654955, "mediaBytes": 0, "pausedCPU": 8.464734995084804, "slowCPU": -1.275557688668689, "slowRSS": 0.11046122086811655, "startupSeekMs": 3.489075760126166} percent. Minimum absolute saving 0.1, measured -0.47193814139830437. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope. |
| results | passed | Five paired actual-player comparisons completed after matching marked-output correctness. Primary pausedCPU gate failed; median paired deltas: {"activeCPU": 4.6825960985654955, "mediaBytes": 0, "pausedCPU": 8.464734995084804, "slowCPU": -1.275557688668689, "slowRSS": 0.11046122086811655, "startupSeekMs": 3.489075760126166} percent. Minimum absolute saving 0.1, measured -0.47193814139830437. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope. |
| decision | passed | Five paired actual-player comparisons completed after matching marked-output correctness. Primary pausedCPU gate failed; median paired deltas: {"activeCPU": 4.6825960985654955, "mediaBytes": 0, "pausedCPU": 8.464734995084804, "slowCPU": -1.275557688668689, "slowRSS": 0.11046122086811655, "startupSeekMs": 3.489075760126166} percent. Minimum absolute saving 0.1, measured -0.47193814139830437. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope. |

[New run](../../shared/runs/20260920T132058Z-whole-player-policies/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
