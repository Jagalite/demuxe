<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# guarded narrow arithmetic

PinnedFFmpeg scalar4x4IDCT guardednarrow variant now includes actualguard+fallback cost. NewUBSan run and4096mixedeligible/ineligibleblocks compare exact outputpixels and clearedcoefficients against unchanged pinnedbaseline, retaining85536corner/randomproof. Deterministic50%within2672guard and50%ineligible3000 coefficientblocks; onemillionblockowner tasks withinputgeneration/prechecks/processstartup/dispatch/copies/checksum/exit included. Candidate23.787ms versusbaseline25.335ms: saving6.11% bootstrap95[-7.593754202191438, 18.14447076302259], no accepted10%valuegate. Native scalar syntheticdistribution, not realcodec admission/SIMD or production speed proof. Historical LGPL sourcebody unmodified; originalnoticesretained and independentApache wrapperonly.

Next: Scoped guardedscalar experiment complete without established value. Reopen with real coefficient admission traces and a separately implemented SIMD candidate, includingguard/fallback/copycost; no production integration justified yet.
