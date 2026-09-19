<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual future AVC video replacements small160x96→large320x180→small160x96 at2/4 s retain original AAC source buffer and 440Hz observed output while playing. Fresh init segments, EOF and reverse/forward seeks pass; stale pre-commit generation and invalid preparation reject.

Next: Run numbered synchronized 360p/720p frame oracles, exact unchanged PCM, paused and seek-during-commit variants, real failed-init rollback and closed-GOP misalignment controls.

No full correctness or performance acceptance. See shared runs for immutable positive and negative variants.
