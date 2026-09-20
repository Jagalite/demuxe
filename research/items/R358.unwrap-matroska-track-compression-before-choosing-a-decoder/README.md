<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Unwrap Matroska track compression before choosing a decoder

Current decision: **pursue**. Restricted single-zlib/unlaced static Matroska can be safely unwrapped before route selection only with strict bounded admission: permissive demux silently truncated hostile inputs. Research-only gate closes these controls with exact full pixels and PCM; eleven fresh jobs satisfy predeclared added-latency budget.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Restricted single-zlib/unlaced static Matroska can be safely unwrapped before route selection only with strict bounded admission: permissive demux silently truncated hostile inputs. Research-only gate closes these controls with exact full pixels and PCM; eleven fresh jobs satisfy predeclared added-latency budget. |
| correctness | passed | Scoped finite 36,117-byte VP9/Opus fixture,149 unlaced compressed blocks,33,083 expanded bytes. All output pictures and PCM equal independent host decoder; historical actual browser playback/cancellation plus new worker termination. Malformed deflate,32MiB expansion,unsupported algorithm reject before Wasm output. Explicit source8MiB,block1MiB,total32MiB ceilings. Not a general Matroska admission proof: lacing,multiple/nested encodings,configuration transitions,source refresh and streaming unknown sizes excluded. |
| performance | passed | Predeclared11 alternating-order pairs on identical valid149block input: fresh baseline and strict-gate workers, full setup/fetch/remux/close timed, every output independently pixel/PCM exact. Median full-job incremental cost49.1ms, range4.2–94.9ms, under250ms added-cost budget. Baseline1source fetch, candidate2(36,117bytes each),15ms delayedHTTP included. Warm browser/runtime cache; browser startup common/excluded. Baseline only valid input; hostile baseline failures remain explicit. This passes local added-cost budget, not an efficiency, physical memory, energy or production latency claim. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Restricted single-zlib/unlaced static Matroska can be safely unwrapped before route selection only with strict bounded admission: permissive demux silently truncated hostile inputs. Research-only gate closes these controls with exact full pixels and PCM; eleven fresh jobs satisfy predeclared added-latency budget. |

Next/reopen: Pursue only strict finite static zlib profile. Production integration must preserve fail-closed admission and enforce per-track contracts, cancellation during validation and budget policy. Reopen broader configurations only with corresponding independent fidelity and hostile controls.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
