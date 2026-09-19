<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode an Ambisonic sound field natively, then render its spatial meaning separately

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Genuine mapping-family-2 four-channel Opus decoded with correct channel tones and near-exact host PCM. Explicit ACN/SN3D W,Y,Z,X directional matrix matches scalar oracle; wrong ordering fails. No physical spatial qualification.

Correctness: **passed**. Performance: **pending**.

Mapping-family-2 Opus produces 96000 four-channel frames with max host PCM error 3.725e-8; truncated input rejects. Four ACN/SN3D directions match scalar reference within 7.451e-9, while wrong ordering differs about 0.2. Cleanup recorded; physical spatial output excluded.

Next: Define spatial renderer and head-tracking/device contract separately; no acoustic or energy claim from this component.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
