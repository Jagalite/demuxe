<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Generate seek fragments without replaying a mux session

`R296.generate-seek-fragments-without-replaying-a-mux-session`

Current decision: **pursue**. Qualified immutable one-sample AVC fragment constructor executes requests 20,3,21,3 without previous mux replay; repeated request byte-identical, independent packet payload/timing oracle passes, every output decodes one frame. Stale identity, outside ordinal and declared non-RAP reject.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Generated or reused hashed synthetic fixtures, executable harness and independent FFprobe/reference evidence for the bounded component. |
| screen | passed | Qualified immutable one-sample AVC fragment constructor executes requests 20,3,21,3 without previous mux replay; repeated request byte-identical, independent packet payload/timing oracle passes, every output decodes one frame. Stale identity, outside ordinal and declared non-RAP reject. |
| correctness | pending | Component packet/timing and decodability pass; all-intra source and declared non-RAP control do not qualify real GOP dependencies or lifecycle. |
| performance | pending | Equivalent-work performance not measured; relevant complete correctness and real owner workload remain prerequisites. |
| results | passed | Positive and negative variants preserved in immutable runs with manifests. |
| decision | passed | Scoped pursue decision; integration and production qualification separate. |

Next: Trace real repeated distant seeks including cold source/index cost; test dependent GOP rejection, configuration changes and cancel generation before player adoption.

Original contract and definition: [item.json](item.json). [History](history.jsonl). [Evidence index](evidence/index.json).

- [Run 20260919T200000Z-stateless-seek](evidence/20260919T200000Z-stateless-seek/run.json)

Research decision only; production integration and release qualification remain unassessed.
