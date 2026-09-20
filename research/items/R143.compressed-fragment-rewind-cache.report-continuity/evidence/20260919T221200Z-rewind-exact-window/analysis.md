<!-- SPDX-License-Identifier: CC-BY-4.0 -->

A byte-capped compressed cache restores an evicted first fragment on the same SourceBuffer and reproduces all 48 independent pictures in the exact two-second window. Source, configuration and generation mismatches reject cache reuse. Retained application payload is 33,765 bytes versus 2,949,120 bytes for the actually allocated decoded RGBA cache, a 98.86% reduction.

Correctness: Video-only AVC with predictive frames and RAP-aligned fragments. A two-fragment cache includes initialization bytes, enforces its byte cap by actual eviction, reports a cache miss, and rejects changed source/configuration/generation keys before append. Native MSE removes the first second, then reappends the exact 16,708-byte cached fragment without replacing its SourceBuffer. All 48 pictures in [0,2) match an independently prepared full-source decoded cache; backward seek, EOF and cleanup pass. Cache identity is a tested research owner, not maintained production admission.

Performance: Predeclared deterministic application cache payload accounting: at least 50% reduction for the same 48-picture window. Candidate 33,765 bytes including initialization and two copied compressed fragments; baseline 2,949,120 bytes in 48 actual RGBA arrays. Reduction 98.8551%, gate passed. Cold decoded preparation 521.4 ms, compressed preparation 0.875 ms, and rewind plus 48 image checks 343.765 ms are descriptive single-run observations, not comparative latency claims. Shared resident fixture and hidden MSE/decoder allocations are explicitly excluded; no physical-memory or energy inference.

Next/reopen: Bounded cache component is worth pursuing. Reopen for maintained source/configuration identity, real source cancellation, non-RAP cache misses or other media profiles; measure complete deployment cost before changing player cache policy.

Bounded research result, not production or release admission.
