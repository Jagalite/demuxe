<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Frame-accurate video editing with only local re-encoding

Full identity: `R077.definition-not-recovered`.

Current decision: **pursue** (actual_route_qualification).

Uniform lossless H264 smart cut qualified:46of106frames reencoded,60slice payloads preserved, exact output/timestamps and34.29% median walltime saving. Mixed-profile variant is a retained correctness failure, not qualified.

Next action: Implement eligibility validation for uniform lossless profile; investigate mixed-profile splice divergence before any claim for arbitrary lossy sources, Bframes, openGOP or audio.

## Definition and contract

Lossless H264 video-only640x36030fps closed-GOP noB source. Frameaccurate cut[7,113): reencode46 boundary frames losslessly, copy60 interior VCL slices, remux rebased106frames. Mixed lossyinterior/losslessedge concatenation failed pixelcontract and remains excluded.

Derived openly from the recovered title; the original detailed report is unavailable.

All106 decoded YUV frames exact against independent source-full-decode trim, timestamps exactlyrebased, all60interiorVCL hashes preserved, wrongstart detected; seek/reopen/sourcechange/termination pass.

Seven alternating complete edit jobs, median ratio 0.657081, every pair faster; >=5% median threshold met. Includes demux, edge decode/encode, I/O/concat/mux, setup and teardown. Source fixture preparation excluded equally.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Lossless H264 video-only640x36030fps closed-GOP noB source. Frameaccurate cut[7,113): reencode46 boundary frames losslessly, copy60 interior VCL slices, remux rebased106frames. Mixed lossyinterior/losslessedge concatenation failed pixelcontract and remains excluded. |
| prepare | passed | Synthetic generation, independent oracle, exactcommands/runtimehashes and wrongoutput controls recorded; preserveddiagnostics included. |
| screen | passed | Actual candidate executed, no conventionaldecode fallback hidden; scoped admissibility and failures recorded. |
| correctness | passed | All106 decoded YUV frames exact against independent source-full-decode trim, timestamps exactlyrebased, all60interiorVCL hashes preserved, wrongstart detected; seek/reopen/sourcechange/termination pass. |
| performance | passed | Seven alternating complete edit jobs, median ratio 0.657081, every pair faster; >=5% median threshold met. Includes demux, edge decode/encode, I/O/concat/mux, setup and teardown. Source fixture preparation excluded equally. |
| results | passed | Uniform lossless H264 smart cut qualified:46of106frames reencoded,60slice payloads preserved, exact output/timestamps and34.29% median walltime saving. Mixed-profile variant is a retained correctness failure, not qualified. |
| decision | passed | Uniform lossless H264 smart cut qualified:46of106frames reencoded,60slice payloads preserved, exact output/timestamps and34.29% median walltime saving. Mixed-profile variant is a retained correctness failure, not qualified. |

[New run](../../shared/runs/20260920T034332Z-recovered-video-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
