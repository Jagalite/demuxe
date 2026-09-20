<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Executed scalar controlled binary64 IIR a0.98 with128sample affine block transforms,96000sample source,35reordered100-block edit plans and300seek queries. Each query renders128actual continuation samples:42880outputs differ from independent ordinary recurrence by at most7.3726e-17 under explicit1e-12 tolerance. Wrong composition causes0.08593error; source/filter/offset/cancel controls reject. Baseline uses real cold exact recurrence checkpoints for ordinary seeks and actual sample replay for reordered plans. Five alternating source read/hash/cache construction plus all plans/seeks/output jobs30.584ms versus54.054ms ratio0.56580 passes<=0.9. Candidate numeric cache18008bytes versus6008checkpoint payload; not processRSS.

Pursue this explicit mixed reordered-plan/seek workload and controlled stable scalar filter. Numerical agreement is bounded tolerance, not bitwise identity; no general nonlinear/time-varying graph, decoder state or production integration claim. Pure canonical seeking already has exact checkpoints, and this experiment does not show superiority there in isolation.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.
