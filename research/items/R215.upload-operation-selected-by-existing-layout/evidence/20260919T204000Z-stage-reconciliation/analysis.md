<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Historical evidence reviewed and hashed; no experiment rerun.

Correctness: passed. Actual stride-awareGL pixels byte-identical to checkerboard reference; badstride rejects, row state restored and frame closes. Black/whiteSDR only.

Performance: pending. 120JS-copy bytes removed is not CPU saving; driver copies/color/HDR remain outside scope.

Prior finding remains scoped: Reconciled completed prior evidence: A direct stride-aware heap upload produces byte-identical GL pixels, removes120 JavaScript row-copy bytes for the tested frame, restores row state and rejects short stride. Driver copies and CPU benefit remain unmeasured.

Production integration and release qualification remain separate.
