<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reduce video frame rate before decoding

Full identity: `R076.definition-not-recovered`.

Current decision: **pursue** (actual_route_qualification).

Dependency-safe predecode thinning qualified on declared720p software H264 profile:107/240 pictures retained exact and19.25% median total walltime saving. Variable cadence and reference structure constrain applicability.

Next action: Integrate an explicit opt-in policy only for identified nonreference pictures; rerun native/WebCodecs/audio synchronization and other reference structures before broader use.

## Definition and contract

H264 closed-GOP no B-pyramid nonreference pictures dropped before reconstruction, retaining all reference pictures and original variable PTS. 1280x720 240frame profile qualified; 360p setup-dominated variant inconsistent across repeats. No target constantfps guarantee.

Derived openly from the recovered title; the original detailed report is unavailable.

107 retained frames exact against full decoder output indexed by matching source PTS; key-only wrongselection detected, no-Bfallback exact, five seek/reopen cases exact order/count, subprocess cancel and freshowner verified.

Seven alternating complete fresh-process jobs, median ratio 0.807506, every pair faster, >=5% median threshold met. Includes output serialization and teardown; no physical energy claim.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | H264 closed-GOP no B-pyramid nonreference pictures dropped before reconstruction, retaining all reference pictures and original variable PTS. 1280x720 240frame profile qualified; 360p setup-dominated variant inconsistent across repeats. No target constantfps guarantee. |
| prepare | passed | Synthetic generation, independent oracle, exactcommands/runtimehashes and wrongoutput controls recorded; preserveddiagnostics included. |
| screen | passed | Actual candidate executed, no conventionaldecode fallback hidden; scoped admissibility and failures recorded. |
| correctness | passed | 107 retained frames exact against full decoder output indexed by matching source PTS; key-only wrongselection detected, no-Bfallback exact, five seek/reopen cases exact order/count, subprocess cancel and freshowner verified. |
| performance | passed | Seven alternating complete fresh-process jobs, median ratio 0.807506, every pair faster, >=5% median threshold met. Includes output serialization and teardown; no physical energy claim. |
| results | passed | Dependency-safe predecode thinning qualified on declared720p software H264 profile:107/240 pictures retained exact and19.25% median total walltime saving. Variable cadence and reference structure constrain applicability. |
| decision | passed | Dependency-safe predecode thinning qualified on declared720p software H264 profile:107/240 pictures retained exact and19.25% median total walltime saving. Variable cadence and reference structure constrain applicability. |

[New run](../../shared/runs/20260920T034332Z-recovered-video-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
