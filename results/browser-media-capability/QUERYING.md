# Runtime capability querying and late answers

The final implementation uses browser canPlayType / MediaSource.isTypeSupported answers for the actual plan and selected tracks. Unknown query metadata proceeds to runtime verification; there is no codec support allowlist. Codec token serialization remains necessary to form standards-based queries. Original Matroska PCM integer tracks use token 1; unsupported prepared MP4 PCM is not inferred from this.

MediaCapabilities.decodingInfo adds exact-configuration advisory evidence, with a 150 ms waiting deadline and bounded per-player caching. Required video bitrate/frame-rate metadata must be present; values are not invented. Late successful answers refresh cache and diagnostics and schedule existing automatic-promotion reconsideration. They do not override observed playback failures or force a switch during active playback under the default policy. Predictions do not independently reorder routes.

Validation:
- 52 focused unit tests passed.
- All 32 Chrome/Firefox browser cases passed: run-2026-09-25T18-08-57.884Z.
- Dedicated late-answer Chrome regression passed: late-answer.json. This checks timeout evidence at open, late evidence refresh, reconsideration scheduling, and unchanged native-direct ownership.
- TypeScript and core boundary checks passed.
- Full npm build remains blocked by an existing unrelated missing/incorrect SPDX header in experiments/chrome-browser-cpu/diagnose.mjs.

Earlier failed runs remain available as investigation history. The matched CPU campaign and its limits are documented separately in ../pcm24-routing/REPORT.md; these capability-query changes have not received a new CPU campaign.
