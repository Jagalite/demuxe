<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# cue-less WebM native seek

Current decision: **stop_current_profile**. Native cue-less seek to25s produces same exact displayed frame as indexed30s control, but transfers393216 of395474 source bytes from cold metadata acquisition. Indexed control also reads essentially whole396119-byte fixture. No scan-free remote seek benefit demonstrated; larger/source-indexed profile needed to reopen.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Cold native25s seek yields identical exact framehash andframeTime for indexed/cueless variants, cleanup recorded. Scoped target seek, not general remote scan-free claim. |
| performance | not_applicable | Stop current opportunity: cue-less393216/395474bytes and indexed396119bytes mean near-full-file transfer on this fixture. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
