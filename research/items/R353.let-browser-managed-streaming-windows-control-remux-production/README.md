<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Let browser-managed streaming windows control remux production

Full identity: `R353.let-browser-managed-streaming-windows-control-remux-production`.

Current decision: **pursue** (component_test).

Installed WebKit26 exposes real ManagedMediaSource. Actual startstreaming/endstreaming events gate prepared-fragment production: initial production stops at33/90 fragments while playback continues; seek to75s resumes demand and advances beyond80s. Bufferedchange fires48times and149video frames observed. Declared full duration is required; first short-input and seek-clamping variants are retained. Removes Chrome-only environment block; no integrated remux, eviction-repair or exact A/V fidelity qualification.

Next action: Connect the demand gate to actual incremental remux, then independently verify rendered A/V and demanded-interval repair after genuine browser eviction.

## Definition and contract

Can the preparation pipeline cooperate with ManagedMediaSource demand signals instead of only changing its network-fetch policy? ManagedMediaSource exposes startstreaming/endstreaming, and ManagedSourceBuffer exposes bufferedchange. Browser-managed eviction means that data once appended is not necessarily still resident. These are API primitives; their exact implementation must be qualified on the test browser. [S1, S2] On endstreaming, stop initiating speculative reads, demuxing, and remux jobs, while finishing or safely retaining in-flight work at valid boundaries. On renewed demand, produce the required next presentation interval. Maintain distinct records for source availability, prepared media, and actual browser-buffer residency. Repair demanded missing intervals together with their decode dependencies; do not refill every evicted interval reflexively.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Observe authentic ManagedMediaSource production-demand stop/resume on current installed WebKit with prepared video fragments. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | Installed WebKit26 exposes real ManagedMediaSource. Actual startstreaming/endstreaming events gate prepared-fragment production: initial production stops at33/90 fragments while playback continues; seek to75s resumes demand and advances beyond80s. Bufferedchange fires48times and149video frames observed. Declared full duration is required; first short-input and seek-clamping variants are retained. Removes Chrome-only environment block; no integrated remux, eviction-repair or exact A/V fidelity qualification. |
| correctness | pending | Real browser demand, paused production, seek resumption and cleanup observed. Pixel/audio oracle, actual remux cancellation and eviction reconstruction are not exercised by prepared video-only fragments. |
| performance | not_applicable | Current endpoint is scoped feasibility, not a measured performance claim; reopen for a predeclared equivalent-work benchmark after complete relevant correctness. |
| results | passed | Positive/negative evidence and limitations captured in immutable run. |
| decision | passed | pursue: Installed WebKit26 exposes real ManagedMediaSource. Actual startstreaming/endstreaming events gate prepared-fragment production: initial production stops at33/90 fragments while playback continues; seek to75s resumes demand and advances beyond80s. Bufferedchange fires48times and149video frames observed. Declared full duration is required; first short-input and seek-clamping variants are retained. Removes Chrome-only environment block; no integrated remux, eviction-repair or exact A/V fidelity qualification. |

[New run](../../shared/runs/20260919T200500Z-managed/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
