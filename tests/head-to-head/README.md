<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Maintained player comparison

See [the head-to-head guide](../../docs/HEAD-TO-HEAD.md) for preparation, matrix
selection, acceptance checks, results, performance gates and limitations.

- `assets.lock.json`: exact competitor/runtime dependency identities.
- `setup.py`: isolated current-Demuxe snapshot and synthetic fixture generator.
- `matrix.json`: the original 28 explicitly declared combinations.
- `planned.json`, `expand.py`, `bitmap.py`: the 56 additional catalogue combinations and original synthetic fixture generators.
- `subtitle-ocr.swift`: rendered text verification through macOS Vision.
- `render-catalogue.py`: refresh README/detailed tables from verified complete outcomes and explicit supplements.
- `adapters.mjs`: public player APIs and correctness-only audio observation.
- `run.mjs`: serial runner, fresh outputs, per-case outcomes and gated performance.
- `checks.mjs`, `contracts.mjs`: independent marker/range/identity acceptance controls.
- `verify.mjs`: completed-run evidence integrity, without playback.

Do not run performance concurrently with the research agent or other benchmarks.
Do not overwrite a run or substitute old engine binaries to make a blocked case pass.
