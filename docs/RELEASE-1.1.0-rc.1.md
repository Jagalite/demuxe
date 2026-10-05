<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.0-rc.1 candidate

Review baseline: `reduced-v1.0.0` (`1e638ed47132b888850d443bb316a6902cded44c`). Qualification must identify the final candidate revision and archive hashes; earlier release evidence does not qualify changed bytes.

This version intentionally changes the player layout API. Supported values are `classic`, `cinema`, `rail`, `studio`, `focus` and `deck`. Replace v1 `modern` and `playground` property values with a supported value. Removed property values throw `INVALID_ARGUMENT`; removed attribute values fall back to Classic. GitHub Pages defaults to Classic.

Changes include provider preferences, bounded AVC presentation ordering, new preview sampling strategies and player compositions. Review fixes preserve selective PCM startup after late native audio initialization, provider-ordered play/seek fallback, preview progress after unsuccessful samples, keyboard focus after autoplay, and immediate settings dismissal. Tagged packaging explicitly includes the Shaka runtime required by its qualification lane.

Use the complete clean-build and exact-archive sequence in [RELEASE.md](RELEASE.md) and [TAG-RELEASE.md](TAG-RELEASE.md), plus the API browser matrix, performance and endurance campaigns. A release-ready claim requires their final receipts. Publication and npm staging are separate actions.
