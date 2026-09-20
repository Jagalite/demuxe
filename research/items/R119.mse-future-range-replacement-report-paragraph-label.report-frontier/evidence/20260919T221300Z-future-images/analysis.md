<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Valid same-configuration future replacement preserves all 96 complete B-frame pictures: the first source remains unchanged and the future interval becomes the requested second source on the same SourceBuffer. However, the actual failed-append control ends the MediaSource after destructive removal and loses the old future. The currently required rollback gate fails, so this is not a qualified replacement transaction.

Correctness: Two independent 48-frame AVC sources, 24 fps, composition lead 83.333 ms. Replace the future at the established RAP boundary while paused at 0.5 s. Every valid-path queried RGBA image matches the isolated source oracle and the same SourceBuffer remains. A real AAC-only initialization under the AVC lane produces CHUNK_DEMUXER_ERROR_APPEND_FAILED; the range falls from [0.083333,4.083332] to [0.083333,2.083332] and the MediaSource ends. Cleanup passes. Existing stale-generation controls remain separate; no audio or transactional rollback claim is inferred from the positive picture result.

Performance: Not applicable after the required failed-commit retention gate fails. No benchmark of an unqualified transaction.

Next/reopen: Reopen with validated preparation before removal and an explicit recovery contract for failures after mutation. A full rebuild may be a declared fallback, but must not be described as retaining the old presentation. Then repeat valid and failed full-picture lifecycle gates before cost measurement.

Bounded research result, not production or release admission.
