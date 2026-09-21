<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff: D71–D73

Read REPORT.md, evidence/analysis.json, and evidence/replay_summary.json before proposing changes. These are standalone component screens tied to repository-lineage commit ee7fe7774270. They do not establish current maintained behavior, whole-player benefit, hardware decoding, or performance. D labels are provisional; preserve full lineage keys and do not invent canonical R-number assignments.

## First inspect, then select a smallest next gate

**D71 — restricted compressed reverse.** Inspect the existing preview/reverse owner and R085. Require a genuinely existing all-IDR source with one validated configuration; do not re-encode predictive movies to create the premise. Reuse existing demux/index/sample-view owners. Validate source identity, payload/configuration association, access-unit completeness, actual IDR/dependency rules and rational durations. New presentation time must map to original source time, including return seeks. Test cancellation and bounded reads. Compare full cost to a native image/decoded-frame or existing GOP cache baseline, including index construction and lifetime. No full decoded cache is requested by this candidate, but browser and compressed-source storage still cost memory. Audio reversal and subtitles are separate contracts.

**D72 — sparse VFR regression first.** Read current R112 and existing WebM/Shaka ownership. Run the six known durations through the actual producer. Inspect complete coded-frame buffered intervals, not only source duration or packet hashes. Exact BlockDuration on every sample is the primary candidate; the seven-byte last-only variation is not qualified for playback before the last packet arrives. Use unchanged native-direct as a baseline. Do not add an unconditional fixer to already-correct output. Test progressive arrival, seek, eviction, cancellation and selected audio only after finding an actual maintained gap. The post-EOF duration setter exception is diagnostic API misuse, not a repair algorithm.

**D73 — explicit geometry boundaries.** Trace coded dimensions, sample aspect, track display dimensions, rotation and natural media-element dimensions separately. Confirm that presenters, captions, pointer coordinates and crop operations do not apply presentation transforms twice. Use source-authoritative metadata rather than inventing a precedence rule for inconsistent input. Test the factorial fixtures on the maintained native/hybrid routes and at dynamic transitions. Same natural dimensions do not establish same color pixels: the direct/MSE hashes differed even for coherent inputs. Do not erase the independent R008 fidelity stop.

## Evidence standard

Retain all primary/replay results. 116 assertions are not 116 discoveries. Natural frame callback counts vary and are not a complete physical scanout oracle. Tests here used Chromium 144; broader browser/OS/decoder evidence remains separate. New runtime writes or PRs require a specific user task; this package itself makes no repository modifications.
