<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use a source-bound seek map rather than repeated fragment scanning

Current decision: **stop_current_profile**. Actual source-bound map retains exact packet payload/timing with stale/bounds/corruption guards and cuts userspace source-file bytes69.25% including cold map cost. Eleven repeated fresh-owner batches nevertheless add34.61% median elapsed cost after map parsing/copy/file preparation. Stop this host profile as a latency optimization.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Actual source-bound map retains exact packet payload/timing with stale/bounds/corruption guards and cuts userspace source-file bytes69.25% including cold map cost. Eleven repeated fresh-owner batches nevertheless add34.61% median elapsed cost after map parsing/copy/file preparation. Stop this host profile as a latency optimization. |
| correctness | passed | Real hostlibavformat8.1.2 custom AVIO; each regenerated query requests24video packets at sourcebound fragments2,4,6,8seconds. Every query candidate/fullsource payload+PTS+DTS+duration digest exact, independently FFprobe checks eachselected24packets. Sourceidentity,corruptspan,outofbounds reject. Prior complete excerpt pixels/PCM oracle retained separately. Model is finite immutable map plus freshdemux owner, not remoteRange/Wasm/nativeplayer or same-context seek integration. |
| performance | failed | Predeclared11alternating batches of10regenerated seeks, cold source read/hash/mapbuild chargedonceperbatch; selection/spanhash/copy/scratchwrite plus libavformat fileload/open/findstream/seek/24packet hash/close included. Processlaunch common excluded. Median elapsed saving -34.6139%, bootstrap95 median[-150.7609%,0.7790%], failing5% gate. Userspace sourcefilebytes saving69.25197% passes50% readgate; logicalAVIOreads separately raw. Warm hostfilecache, no physicaldisk/network/CPUenergy claim. Existing same-contextMOV fragment index remains and this is not claimed universally duplicated scanning. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Actual source-bound map retains exact packet payload/timing with stale/bounds/corruption guards and cuts userspace source-file bytes69.25% including cold map cost. Eleven repeated fresh-owner batches nevertheless add34.61% median elapsed cost after map parsing/copy/file preparation. Stop this host profile as a latency optimization. |

Next/reopen: Reopen for a direct scatter/gather or range-backed input that avoids host temporary-file copying, or a measured network-latency workload where source-byte reductions dominate. Prove new owner integration and predeclare profile; retain current negative.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Ecosystem follow-up EB13

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **no_new_work_current_scope**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The local metadata probe walks checked box lengths with box/read budgets, handles safe extended top-level sizes and fails closed to deep inspection. Source reads are bounded. R045's source-map latency regression remains relevant; no new remote seek-versus-skip threshold is measured.

Next gate / reopening condition: Keep bounded local metadata skipping. Reopen remote policy only with a measured Range-capable transport workload and stale-hint, malformed-size and ignored-Range controls; include index acquisition cost.

This scoped supplement does not broaden earlier correctness or performance qualification.
