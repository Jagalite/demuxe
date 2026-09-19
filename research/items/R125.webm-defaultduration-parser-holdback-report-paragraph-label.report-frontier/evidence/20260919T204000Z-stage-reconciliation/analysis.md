<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Historical evidence reviewed and hashed; no experiment rerun.

Correctness: passed. VP8 first-block DefaultDuration100ms exposes one frame/[0,.1]range; same-size Void adverse variant exposes none until tail. Both EOF and cleanup recorded. Parser-availability regression scope only; VP9 cases do not show same benefit.

Performance: not_applicable. Regression-only parser behavior; no fabricatedVFR duration or maintained-mux speed claim.

Prior finding remains scoped: Reconciled completed prior evidence: Truthful 100ms VP8 DefaultDuration yields one early frame and [0,0.1] range from the first block. Replacing only this metadata with same-size Void yields neither until remaining bytes arrive. Worth retaining as parser-availability regression coverage; does not justify inventing VFR durations or claim a missing maintained mux feature.

Production integration and release qualification remain separate.
