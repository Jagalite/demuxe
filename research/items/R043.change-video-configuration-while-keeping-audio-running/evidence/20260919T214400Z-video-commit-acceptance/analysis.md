<!-- SPDX-License-Identifier: CC-BY-4.0 -->

The valid 360p/720p geometry paths render exact pictures, but the current remove-then-append transaction cannot preserve playback after a real incoming initialization failure. Both paused/seek and future-playing controls lose old video beyond 2 seconds and end MediaSource; retained AAC buffer identity does not establish uninterrupted audio after a failed destination.

Correctness: Actual wrong-track AAC initialization appended to the AVC video lane rejects after future-video removal. Old video ends at 1.999999 s instead of 6 s in both variants; audio remains buffered through 6.021333 s while the MediaSource has ended. Cleanup and stale-generation rejection pass. Independent 72-frame legal geometry evidence is retained separately; no claim of exact PCM or rollback.

Performance: No benchmark after the failed transaction fidelity gate.

Next/reopen: Reopen with actual source/configuration preparation that prevents this mismatch before removal, plus a declared recovery path for post-removal failures; then repeat unchanged PCM, paused/seek lifecycle, and equivalent complete-cost gates.

Bounded research result, not production or release admission.
