<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make exact Ogg Opus clip edges with packet copy plus pre-skip/end trimming

Full identity: `R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming`.

Current decision: **pursue** (2026-09-19T20:13:17.931463+00:00).

Exact copied-packet full-prefix Ogg crop reused from R094 retains the correct same-decoder state. Newly shortened 83.6875ms preroll keeps 55545 samples but changes 4315 samples, max absolute float error 0.00774363; do not substitute a recommended duration for an exact-state proof.

## Tested contract

Mono chirp/impulse Ogg Opus crop 12345:67890; full-prefix host/browser oracle reused; shortened-prefix host adverse run

Next action: Measure practical retained-prefix costs; admit a shorter history only with an explicit non-bit-exact tolerance or a justified state equivalence proof.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Exact mechanism and bounded profile distinguished from overlapping item keys. |
| prepare | passed | Fixtures, independent same-decoder output references, wrong-output controls and runtime/source hashes pinned. |
| screen | passed | Exact copied-packet full-prefix Ogg crop reused from R094 retains the correct same-decoder state. Newly shortened 83.6875ms preroll keeps 55545 samples but changes 4315 samples, max absolute float error 0.00774363; do not substitute a recommended duration for an exact-state proof. |
| correctness | passed | Full-prefix exact sample oracle plus meaningful same-length shortened-state failure establish bounded component contract. |
| performance | pending | No benchmark; full-prefix preservation may remove practical seek/cut savings. |
| results | passed | New and reused execution identities, controls, limits, manifests and commands captured. |
| decision | passed | Scoped pursue disposition; integration and release qualification remain separate. |

[Shared run](../../shared/runs/20260919T201317Z-ogg-controls/run.json) · [Analysis](../../shared/runs/20260919T201317Z-ogg-controls/analysis.md) · [Manifest](../../shared/runs/20260919T201317Z-ogg-controls/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Historical definitions/evidence remain intact. No production integration or release qualification.
