<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Hibernate long-paused presentations under an explicit memory policy

Disposition: **inconclusive**. correctness: **passed**, performance: **failed**.

Implemented explicit opt-in paused-VOD hibernation for eight localvideo-only owners, retaining eight bounded320x180stills (1843200logicalRGBAbytes) and source/time/rate/volume/mute/selection snapshot. Live/PiP/nonoptin/non-userpaused policy guards reject. Retired media owners remove src/load toreadyState0; all eight restored paused images and settings are exact, and cancellation discards an in-flight restoration without retiring eight survivors. Original run caught playbackRate reset to1 during native media load; a diagnostic confirmed it, then one correction sets defaultPlaybackRate and reapplies1.25 afterload. Preserve both negatives. Nine before/after within-owner browserprocess RSS pairs (only ownCDP processIDs;150ms afterretirement) show1.93% resident-proxy reduction,95%[0.19428124207718778, 3.431383609483629]; below10%lower-boundgate. All8-owner restores <= 232.20ms meet250ms ceiling. Therefore correctnesspasses but memoryvalue notestablished; do not replace failed memorygate with fewer video elements. RSS includes shared pages/caches and is not physicalallocation attribution; baseline/candidate ordering fixed by lifecycle and concurrenthost activity limits inference. No live/PiP/DRM/caption/alternate-track/networkauth or production idlepolicy admission.

Next: Reopen with a workload showing measured resident-memory benefit under a declared idle/resume tradeoff, or a more attributable memory instrument. Preserve explicit opt-in and complete source/settings snapshot; no production policy change.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T221431Z-restore-rate/analysis.md)
