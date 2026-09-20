<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserve floating-point audio through an integer-only codec

Full identity: `R079.definition-not-recovered`.

Current decision: **stop_current_profile** (actual_route_experiment).

Actual browser FLAC integer16 limb transport reconstructs all96000 finite float32 stereo samples bit-exact, including magnitudes above1; offline output exact and lifecycle closes. Ordinary FLAC changes86488samples; swapped limbs change95998. Initial symmetric integer normalization failed37212samples; diagnostic preserved, sign-dependent normalization resolves it. Candidate decode+reconstruction median paired ratio 20.286x vs float WAV; payload338857 vs384092bytes. Capability works at this profile, but direct float WAV is already available and much cheaper to decode.

Next action: Reopen if an integer-only transport is mandatory and bandwidth/storage benefit offsets custom reconstruction; qualify streaming, rate/layout variation and special floats separately.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Stereo48kHz finite float32 via4channel16bitFLAC transport and custom unpacking; no direct ordinaryFLAC playback claim. NaN/Inf/subnormal patterns only tested in integer packing, not actual audio rendering. |
| prepare | passed | Stereo48kHz finite float32 via4channel16bitFLAC transport and custom unpacking; no direct ordinaryFLAC playback claim. NaN/Inf/subnormal patterns only tested in integer packing, not actual audio rendering. |
| screen | passed | Actual browser FLAC integer16 limb transport reconstructs all96000 finite float32 stereo samples bit-exact, including magnitudes above1; offline output exact and lifecycle closes. Ordinary FLAC changes86488samples; swapped limbs change95998. Initial symmetric integer normalization failed37212samples; diagnostic preserved, sign-dependent normalization resolves it. Candidate decode+reconstruction median paired ratio 20.286x vs float WAV; payload338857 vs384092bytes. Capability works at this profile, but direct float WAV is already available and much cheaper to decode. |
| correctness | passed | Actual browser FLAC integer16 limb transport reconstructs all96000 finite float32 stereo samples bit-exact, including magnitudes above1; offline output exact and lifecycle closes. Ordinary FLAC changes86488samples; swapped limbs change95998. Initial symmetric integer normalization failed37212samples; diagnostic preserved, sign-dependent normalization resolves it. Candidate decode+reconstruction median paired ratio 20.286x vs float WAV; payload338857 vs384092bytes. Capability works at this profile, but direct float WAV is already available and much cheaper to decode. |
| performance | failed | Predeclared paired job gate; median candidate/baseline ratio 20.285715. Scope and excluded costs are explicit in the protocol and raw rows. |
| results | passed | Actual browser FLAC integer16 limb transport reconstructs all96000 finite float32 stereo samples bit-exact, including magnitudes above1; offline output exact and lifecycle closes. Ordinary FLAC changes86488samples; swapped limbs change95998. Initial symmetric integer normalization failed37212samples; diagnostic preserved, sign-dependent normalization resolves it. Candidate decode+reconstruction median paired ratio 20.286x vs float WAV; payload338857 vs384092bytes. Capability works at this profile, but direct float WAV is already available and much cheaper to decode. |
| decision | passed | Actual browser FLAC integer16 limb transport reconstructs all96000 finite float32 stereo samples bit-exact, including magnitudes above1; offline output exact and lifecycle closes. Ordinary FLAC changes86488samples; swapped limbs change95998. Initial symmetric integer normalization failed37212samples; diagnostic preserved, sign-dependent normalization resolves it. Candidate decode+reconstruction median paired ratio 20.286x vs float WAV; payload338857 vs384092bytes. Capability works at this profile, but direct float WAV is already available and much cheaper to decode. |

[New run](evidence/20260920T033221Z-float-limb-codec/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
