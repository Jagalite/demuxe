<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile a qualified mux configuration into a small patch program

Current decision: **pursue**. Compiled fixed moof template plus typed duration/size/tfdt/sequence/data-offset fields reproduces24 qualified single-sample fragments with exact packet payload/timing and decoded frames. Mutated nonparameter skeleton and zero duration reject; generic mux layouts excluded.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Fixed moof patch program reproduces24single-sample packet payload/timing and complete decoded pixels; mutated skeleton/zero duration reject. Pure qualified constructor, arbitrary layout excluded. |
| performance | pending | No equivalent construction benchmark including compile/setup/retention costs. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
