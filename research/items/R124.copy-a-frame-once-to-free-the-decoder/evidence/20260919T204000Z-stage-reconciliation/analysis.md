<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Historical evidence reviewed and hashed; no experiment rerun.

Correctness: passed. Owned I420 redraw matches reference after decoder closure, with23040copied bytes; this establishes one-frame ownership feasibility, not surface pressure relief.

Performance: not_applicable. Stop current profile: bounded existing held frame and no pressure trace justify no routine copy or benchmark.

Prior finding remains scoped: Reconciled completed prior evidence: Copying one decoded frame to owned I420 preserves redraw after decoder closure, at 23040 additional copied bytes for this tiny frame. Existing held-frame ownership is bounded and no decoder surface-pressure evidence exists. Do not add routine copies without a trace showing blocked decoder surfaces.

Production integration and release qualification remain separate.
