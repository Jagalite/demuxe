<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual source-bound map retains exact packet payload/timing with stale/bounds/corruption guards and cuts userspace source-file bytes69.25% including cold map cost. Eleven repeated fresh-owner batches nevertheless add34.61% median elapsed cost after map parsing/copy/file preparation. Stop this host profile as a latency optimization.

Correctness: Real hostlibavformat8.1.2 custom AVIO; each regenerated query requests24video packets at sourcebound fragments2,4,6,8seconds. Every query candidate/fullsource payload+PTS+DTS+duration digest exact, independently FFprobe checks eachselected24packets. Sourceidentity,corruptspan,outofbounds reject. Prior complete excerpt pixels/PCM oracle retained separately. Model is finite immutable map plus freshdemux owner, not remoteRange/Wasm/nativeplayer or same-context seek integration.

Performance: Predeclared11alternating batches of10regenerated seeks, cold source read/hash/mapbuild chargedonceperbatch; selection/spanhash/copy/scratchwrite plus libavformat fileload/open/findstream/seek/24packet hash/close included. Processlaunch common excluded. Median elapsed saving -34.6139%, bootstrap95 median[-150.7609%,0.7790%], failing5% gate. Userspace sourcefilebytes saving69.25197% passes50% readgate; logicalAVIOreads separately raw. Warm hostfilecache, no physicaldisk/network/CPUenergy claim. Existing same-contextMOV fragment index remains and this is not claimed universally duplicated scanning.

Next/reopen: Reopen for a direct scatter/gather or range-backed input that avoids host temporary-file copying, or a measured network-latency workload where source-byte reductions dominate. Prove new owner integration and predeclare profile; retain current negative.

Bounded research result, not production or release admission.
