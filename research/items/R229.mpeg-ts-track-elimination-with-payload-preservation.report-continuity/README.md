<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MPEG-TS track elimination with payload preservation

Current decision: **pursue**. Explicit program202 TS packet filter keeps selected elementary/PCR/PMT PIDs and rewrites PAT with valid CRC. Reversed PAT order produces identical selected payload/timing. Unchanged RemuxPlayer plays/seeks output, complete host decoded pixels/PCM exact. Missing program rejects; dynamic PSI/scrambled transport outside scope.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Program202 selector preserves packet timing/payload under reversedPATorder, rewrites validCRC and rejects missingprogram. Complete hostpixels/PCM exact; maintainedRemuxPlayer plays/seeks/cleans workers. DynamicPSI/scrambling excluded. |
| performance | pending | No equivalent-work transport/preparation cost benchmark. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
