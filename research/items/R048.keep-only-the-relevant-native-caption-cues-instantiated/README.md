<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep only the relevant native caption cues instantiated

Current decision: **pursue**. Actual10000-cue native TextTrack versus at-most22 materialized cues yields identical active cue text at6 forward/backward seeks, including near end. Removing active cue detected. Native cue-object count reduced; total memory/CPU benefit and API-compatible player adapter unqualified.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Six forward/backward native TextTrack seeks have exact active text against10000-cue baseline; removing an active cue is detected and cleanup recorded. Scope is cue selection, not renderer styling/API integration. |
| performance | pending | Native cue-object reduction measured; total memory/CPU and materialization costs unmeasured. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Read the supplied local follow-up and verify the named raw record once if accessible. Carry forward its scoped disposition; do not rerun this profile just to populate this ledger. Real large-cue overhead plus a bounded API-compatible design; do not re-open the explained boundary mismatch as a bug.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
