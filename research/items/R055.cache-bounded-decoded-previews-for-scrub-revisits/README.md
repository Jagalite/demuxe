<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache bounded decoded previews for scrub revisits

Disposition: **pursue**. correctness: **passed**, performance: **passed**.

Implemented an explicit requested-preview native video producer and eight-image460800logical-RGBA-byte LRU cache, keyed by source epoch/selection/geometry/time. Every requested160x90 preview exactly matches a separately captured no-cache native/canvas image; this verifies cache identity, not independent JPEG/video decoder fidelity. Actual source replacement clears/closes old entries, rejects a late ImageBitmap promise, and produces distinct new-source pixels; geometry/time keys miss. All bitmaps/URLs/video owners close. Initial trial exposed a transient ninth image because eviction followed capture; preserved results and one correction evicts before capture, checks total created-minus-closed ownership, then reruns unchanged gates. Nine alternating cold-owner pairs include load/seek/capture/cache/readback/hash/cleanup. Revisit24-request workload saves42.93% (95%[38.07462380915495, 46.40375587902117]),56.811→32.422ms, passing10% lower-bound gate; one-way12-unique saves-4.20% (95%[-8.030350924818475, -1.0383888709079248]), so cache is not justified for nonrevisiting traversal. Approximate preview-only route; no readback of every playback frame, total resident memory/physical GPU sharing or production admission claim.

Next: Scoped revisit-preview research gates complete. Keep cache disabled when no preview intent, preserve exact source/selection/geometry/time keys and eight-image cap; assess any future larger image, concurrency or integration contract separately.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T215328Z-strict-cap/analysis.md)
