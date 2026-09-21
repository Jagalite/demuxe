<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Pre-commit review

The measured prototype remains a research integration. The sealed run and its historical tooling are unchanged.

Fixed in maintained tooling:

- Every generator and browser/cache test refuses a sealed run. New runs require an explicit UNIFIED_RUN directory; the default captured run is safe to inspect.
- validate.py is read-only, requires all 22 unique timing profiles, checks their raw results and medians, requires complete preparation records where claimed, verifies captured hashes and explicit teardown evidence, and does not reject historical evidence because the live production checkout has evolved.
- Removed the one-off report finalizer from maintained tooling: it embedded old numeric claims and rewrote canonical history. Its exact original remains in the sealed tooling snapshot. New runs must author their own report/decision and evidence manifest.
- prepare-runtime.py no longer overwrites the corrected browser harness with an earlier version. Reproduction instructions use the maintained guarded tools.
- The current report now exposes the roughly 0.22-second median cold network startup regression as well as the preparation/recovery benefits. Streaming compilation needs a new measured production-port test; no runtime alteration or timing rerun is claimed by this review.

Eight regression cases cover the captured matrix, missing/duplicate profiles, altered medians, missing summary metrics, empty preparation records, sealed-run refusal, and the writable-to-sealed transition. The complete original manifest is checked before and after review. Earlier granular-engine-loading baselines are included as a required research dependency. Unrelated player/experiment changes are excluded from this commit.

Clean-checkout validation passed: build, license checks, release contracts, playback contracts, and all eight review regression tests. The initial clean-copy license failure came from following an unmanifested local FFmpeg source symlink; the link is excluded from the research package, and the retry passed. No upstream source was relabeled or modified.
