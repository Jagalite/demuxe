<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose repairs and resynchronization instead of silently discarding data

Stable key: `explicit-media-repair-accounting`. Origin: EB19.

Decision: **pursue**, bounded source review only.

Remux records errors/gap skips and performs bounded timestamp/configuration repairs, but there is no uniform input/output-range repair ledger in the inspected native/JS interface. Existing typed route errors distinguish interruption from incompatibility; they do not account for every repaired field or skipped byte.

Next action: Start with existing AAC timestamp and AVC/HEVC DTS repairs: emit bounded reason/source-epoch/input-output identities with unchanged-media controls. Then inject junk, truncated init and inconsistent metadata; distinguish strict rejection, requested salvage and live concealment before broadening.

Correctness contract: No silent data loss classified as preservation; unchanged path remains byte-identical when valid; repair budget bounded; unsupported semantics return an explicit outcome.

No browser/media candidate or performance measurement was executed.

## Ecosystem follow-up EB19

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **followup_required**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

Remux records errors/gap skips and performs bounded timestamp/configuration repairs, but there is no uniform input/output-range repair ledger in the inspected native/JS interface. Existing typed route errors distinguish interruption from incompatibility; they do not account for every repaired field or skipped byte.

Next gate / reopening condition: Start with existing AAC timestamp and AVC/HEVC DTS repairs: emit bounded reason/source-epoch/input-output identities with unchanged-media controls. Then inject junk, truncated init and inconsistent metadata; distinguish strict rejection, requested salvage and live concealment before broadening.

This scoped supplement does not broaden earlier correctness or performance qualification.
