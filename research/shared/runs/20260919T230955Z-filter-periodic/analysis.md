<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Executed scalar stable IIR periodic initialization for64sample loop at poles0.8/0.98/0.999/0.9999. One-loop affine fixed point initializes first10requested loops; all2560samples agree with20000-loop ordinary recurrence reference within8.188e-15 under1e-12 tolerance, closure within8.327e-17. Zero initialization produces0.084–0.200error; unstable/nearunit ill-conditioning, source identity and cancellation reject. Measured baseline adaptively converges in3/23/443/4409loops based on posterior state-error estimate, not arbitrary fixed burnin. Five alternating full cold source/hash/state construction/output jobs0.324ms versus15.931ms ratio0.02034 passes<=0.9.

Pursue explicit periodic-state scalar stable linear filtering with the tested conditioning guard. This changes initial-state policy and cannot substitute for zero-state playback, nonlinear/time-varying effects or unstable poles. Reported ratio is this short-loop adaptive-burnin workload only, not general playback speed or a physical-audio claim.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.
