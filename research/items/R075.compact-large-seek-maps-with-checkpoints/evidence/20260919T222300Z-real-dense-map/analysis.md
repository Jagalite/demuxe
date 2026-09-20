<!-- SPDX-License-Identifier: CC-BY-4.0 -->

On an actual100000-picture all-intra MP4 sample map, checkpoint32 delta representation retains353126B versus1600000B Float64 baseline:77.93% less logical array storage. Every reconstructed entry and100000 independent predecessor queries match; stale source, truncated varints and>4GiB arithmetic controls pass. Cold build+query jobs are21.79% slower at median; pursue only the literal retained-array representation capability, not speed, peak memory or an identified production replacement.

Correctness: Independent FFprobe supplies actual all-keyframe PTS/byte positions. All100000 scalar entries and100000 queries exact under separate baseline binary search; malformed stream/source identity rejects; wide-offset controls exact. Index-only component, no media transformation.

Performance: Source-defined array storage gate<=50% baseline passes at22.07%.11 alternating cold constructors+100000queries retain raw timings; median complete latency21.79% worse. Transient author arrays make peak memory higher than final retention and are not physical-heap qualified. No latency or total-resource benefit asserted.

Next/reopen: Use only if a concrete large retained map owner values the77.93% array reduction enough to accept construction/query cost. Maintained native FFmpeg seeks remain unchanged; audit real exposure before integration.

Bounded research result, not production or release admission.
