<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# content-addressed reuse across different files

Full identity: `R200.content-addressed-reuse-across-different-files`.

Current decision: **pursue** (actual_immutable_ownership_memory).

Nine alternating cold ownership constructions preserve both authorized files' exact ordered codec bytes while keeping timeline references separate. Against cheaper per-file content dedup baseline, cross-file sharing reduces median live traced allocation4856→3252bytes (33.03%), including dictionaries/hash keys/list/object overhead, passing declared10% local memory gate. All owner refs release. First naive per-packet comparator retained and superseded.

Next action: Scoped immutable compressed-payload sharing research complete. Production pursuit needs actual cross-file hit rates and runtime memory measurement, retaining authorization and per-source timestamps outside shared storage.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Different owned wrappers share exact coded packets/config; poisoned entry rejects, changed config misses and all owner refs release. Per-source timelines kept separate; no cross-authority claim. |
| performance | passed | Nine alternating cold ownership constructions preserve both authorized files' exact ordered codec bytes while keeping timeline references separate. Against cheaper per-file content dedup baseline, cross-file sharing reduces median live traced allocation4856→3252bytes (33.03%), including dictionaries/hash keys/list/object overhead, passing declared10% local memory gate. All owner refs release. First naive per-packet comparator retained and superseded. |
| results | passed | Nine alternating cold ownership constructions preserve both authorized files' exact ordered codec bytes while keeping timeline references separate. Against cheaper per-file content dedup baseline, cross-file sharing reduces median live traced allocation4856→3252bytes (33.03%), including dictionaries/hash keys/list/object overhead, passing declared10% local memory gate. All owner refs release. First naive per-packet comparator retained and superseded. |
| decision | passed | Nine alternating cold ownership constructions preserve both authorized files' exact ordered codec bytes while keeping timeline references separate. Against cheaper per-file content dedup baseline, cross-file sharing reduces median live traced allocation4856→3252bytes (33.03%), including dictionaries/hash keys/list/object overhead, passing declared10% local memory gate. All owner refs release. First naive per-packet comparator retained and superseded. |

[New run](../../shared/runs/20260919T210830Z-content-owner-baseline/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
