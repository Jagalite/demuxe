<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Change video configuration while keeping audio running

Current decision: **stop_current_profile**. The valid 360p/720p geometry paths render exact pictures, but the current remove-then-append transaction cannot preserve playback after a real incoming initialization failure. Both paused/seek and future-playing controls lose old video beyond 2 seconds and end MediaSource; retained AAC buffer identity does not establish uninterrupted audio after a failed destination.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | The valid 360p/720p geometry paths render exact pictures, but the current remove-then-append transaction cannot preserve playback after a real incoming initialization failure. Both paused/seek and future-playing controls lose old video beyond 2 seconds and end MediaSource; retained AAC buffer identity does not establish uninterrupted audio after a failed destination. |
| correctness | failed | Actual wrong-track AAC initialization appended to the AVC video lane rejects after future-video removal. Old video ends at 1.999999 s instead of 6 s in both variants; audio remains buffered through 6.021333 s while the MediaSource has ended. Cleanup and stale-generation rejection pass. Independent 72-frame legal geometry evidence is retained separately; no claim of exact PCM or rollback. |
| performance | not_applicable | No benchmark after the failed transaction fidelity gate. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: The valid 360p/720p geometry paths render exact pictures, but the current remove-then-append transaction cannot preserve playback after a real incoming initialization failure. Both paused/seek and future-playing controls lose old video beyond 2 seconds and end MediaSource; retained AAC buffer identity does not establish uninterrupted audio after a failed destination. |

Next/reopen: Reopen with actual source/configuration preparation that prevents this mismatch before removal, plus a declared recovery path for post-removal failures; then repeat unchanged PCM, paused/seek lifecycle, and equivalent complete-cost gates.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
