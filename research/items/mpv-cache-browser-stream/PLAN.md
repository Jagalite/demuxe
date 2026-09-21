<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bounded mpv packet-cache experiment

Hypothesis: enabling mpv's normal network-cache strategy over Demuxe's custom
`brange` stream improves interruption tolerance and nearby seek reuse at the
existing 32 MiB forward / 8 MiB backward packet budgets. Native Direct is a
behavioral reference. No production settings or routing will change.

Baseline/candidate pairs use the same frozen browser backend, Wasm binary,
fixture, decoder, renderer, audio queue, and 16 MiB / 256 KiB RangeReader budget.
The only initial candidate override is `cache=yes`, applied before open; all
effective settings are queried from the running mpv. Native uses Demuxe's actual
NativePlayer with remux disabled; Hybrid/Software use actual WasmPlayer directly,
excluding routing/probe/UI overhead from all backend measurements.

Fixtures: licensed BBB movie derivatives, H.264/AAC 360p, HEVC/AAC 540p,
H.264/AAC 540p high bitrate with added temporal noise (synthetic stress), and
the full-length H.264/AAC 360p movie. Record actual bitrate, duration, hashes,
transform commands, source and license. The long file must exceed combined
source and packet-cache limits. Serve with the Demuxe head-to-head Range parser
and experiment-only aggregate media pacing; runtime assets are unthrottled.

Correctness precedes comparative measurements: at paused media times 10 and 30,
compare visible 640x360 screenshots against independently decoded FFmpeg RGB
frames (mean absolute RGB error <18/255, wrong-time frame error at least 3
higher), verify nonzero audio output and expected decoder identity, then require
destroyed surfaces, workers and active media requests to reach zero and tracked
Chrome processes to exit. This bounded gate is not full audio fidelity/A-V sync
or release qualification. Preserve failures and do not performance-qualify them.

Measurements: fresh headed Chrome per trial, 100 ms timeline/property samples,
200 ms existing Wasm diagnostics, 1 s CDP process CPU and summed RSS samples.
Sequential phases after startup: fast 100 Mbps for 10 s; 1.5x measured average
media bitrate for 10 s; 1.05x for 10 s; zero throughput for 8 s; recovery at 2x
media bitrate for 12 s. Carryover is intentional, and phase results must not be
described as independent cold-start network comparisons. Counterbalanced fixture
ordering reduces fixed variant order bias; OS caches are not flushed. Include
startup/ready/first-visible-frame proxy separately. No overlapping media tests or
builds; preserve unrelated user workloads and record the process list.

Then pause, seek 5 s backward, 5 s forward of the pre-seek position, and to 80%
of source duration at restored 100 Mbps. Record request/byte deltas and timeline
coverage before/after. Rebuffer means a post-start playback freeze lasting >=500
ms, corroborated by mpv paused-for-cache/underrun or Native waiting/readyState;
record visual/timeline freezes separately when decode/presentation can explain
them. Exclude startup, deliberate pause and seek from rebuffer totals. Record
outage recovery independently. CPU and memory do not establish cache causality.

Primary favorable signal: lower interruption-induced rebuffer duration at fixed
decode/presentation ownership and current packet bounds. A result is exploratory
with one trial per cell. Repeat a materially positive or suspicious case before
recommendation. Optional 2x playback uses the same network rates relative to file
bitrate (not adjusted to consumption), a deliberately harder condition.

Stop/qualification rules: preserve failures and diagnose the first causal
divergence; do not label decoder-limited playback as a caching regression or
improvement. Do not enlarge cache bounds merely to force a success. Keep source
cache bytes, demux packet bytes/timestamp ranges, decoded queues, PCM audio, Wasm
linear memory, live malloc allocations, and process RSS separate. Unexposed
measurements are null, not zero. Never turn byte counts into buffered seconds.

Scope: complete initial four-fixture five-variant screen, bounded correctness,
eligible sequential-network comparisons, and targeted repeats/tuning only if
evidence justifies them. No commit, publishing or production integration.
