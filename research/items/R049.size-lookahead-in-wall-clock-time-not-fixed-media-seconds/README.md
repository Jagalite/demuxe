<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Size lookahead in wall-clock time, not fixed media seconds

Full identity: `R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds`.

Current decision: **stop_current_profile** (scoped_whole_player_paired_comparison).

Five paired actual-player comparisons completed after matching marked-output correctness. Primary slowRSS gate failed; median paired deltas: {"activeCPU": -3.5457446843012743, "mediaBytes": -2.9900647506697715, "pausedCPU": 9.910127431168018, "slowCPU": 15.272633330711097, "slowRSS": -0.779079372230983, "startupSeekMs": -3.807896017173829} percent. Minimum absolute saving 8192, measured 6640. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope.

Next action: Reopen only for an identified workload where the complete-player primary benefit can exceed the declared cost gate; retain component evidence.

Transport byte counts in the local whole-player run are server ReadStream bytes; they can include buffered or abandoned bytes and are not exact client-received or wire-byte measurements.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Matching exact-asset headed marked picture/audio, seek,rate,pause,EOF and cleanup checks; runtime measurements retain route/progression/drop/error/cleanup assertions. |
| performance | failed | Five paired actual-player comparisons completed after matching marked-output correctness. Primary slowRSS gate failed; median paired deltas: {"activeCPU": -3.5457446843012743, "mediaBytes": -2.9900647506697715, "pausedCPU": 9.910127431168018, "slowCPU": 15.272633330711097, "slowRSS": -0.779079372230983, "startupSeekMs": -3.807896017173829} percent. Minimum absolute saving 8192, measured 6640. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope. |
| results | passed | Five paired actual-player comparisons completed after matching marked-output correctness. Primary slowRSS gate failed; median paired deltas: {"activeCPU": -3.5457446843012743, "mediaBytes": -2.9900647506697715, "pausedCPU": 9.910127431168018, "slowCPU": 15.272633330711097, "slowRSS": -0.779079372230983, "startupSeekMs": -3.807896017173829} percent. Minimum absolute saving 8192, measured 6640. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope. |
| decision | passed | Five paired actual-player comparisons completed after matching marked-output correctness. Primary slowRSS gate failed; median paired deltas: {"activeCPU": -3.5457446843012743, "mediaBytes": -2.9900647506697715, "pausedCPU": 9.910127431168018, "slowCPU": 15.272633330711097, "slowRSS": -0.779079372230983, "startupSeekMs": -3.807896017173829} percent. Minimum absolute saving 8192, measured 6640. Range candidate additionally requires every media-byte increase<=30%. Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change. Frozen authored36s fixture, shared host, browser startup/serverCPU/externalmedia services excluded; RSS maydoublecount sharedpages; no energyclaim. Earlier component measurements remain historical and are not contradicted by a different whole-player scope. |

[New run](../../shared/runs/20260920T132058Z-whole-player-policies/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
