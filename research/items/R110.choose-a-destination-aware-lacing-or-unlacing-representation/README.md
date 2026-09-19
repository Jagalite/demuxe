<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Choose a destination-aware lacing or unlacing representation

Current disposition: **already_implemented**. Historical execution reconciled; no new media run.

Reconciled completed prior evidence: Chrome rejects Xiph-laced Opus; current actual Wasm remux emits a playable representation with all 101 packet payloads, exact decoded PCM and 648-sample final trim preserved. Seek and cleanup pass. Preserve this existing normalization and add regression coverage; no new unlacing subsystem needed for this profile.

Correctness: **passed**. Performance: **pending**.

Chrome rejects paired and single Xiph laces while unlaced baseline plays. Actual maintained Wasm remux preserves 101 packet payloads and 648-sample final discard padding; seek and cleanup pass. Accepted existing normalization profile, no new subsystem.

Next: Keep lacing and final-trim regression coverage; extend other lacing modes only with separate destination/output evidence.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
