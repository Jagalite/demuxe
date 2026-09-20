<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual browser FLAC integer16 limb transport reconstructs all96000 finite float32 stereo samples bit-exact, including magnitudes above1; offline output exact and lifecycle closes. Ordinary FLAC changes86488samples; swapped limbs change95998. Initial symmetric integer normalization failed37212samples; diagnostic preserved, sign-dependent normalization resolves it. Candidate decode+reconstruction median paired ratio 20.286x vs float WAV; payload338857 vs384092bytes. Capability works at this profile, but direct float WAV is already available and much cheaper to decode.

Stereo48kHz finite float32 via4channel16bitFLAC transport and custom unpacking; no direct ordinaryFLAC playback claim. NaN/Inf/subnormal patterns only tested in integer packing, not actual audio rendering.
