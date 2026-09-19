<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact MP3 seek closure

Current decision: **pursue**. Actual MP3 continuous PCM suffix oracle at two targets distinguishes insufficient cold/preroll windows from exact recovery. Validated closure is tied to authored48k stereo128k fixture without Xing trimming; not a universal2-frame rule or browser seek feature.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Continuous MP3floatPCM suffix exact at target100/220only after sufficientpreroll;0/1/2priorframes fail and3passes for authored48kstereo128k/noXing profile. Pure closure oracle, no universal2-frame or browser-admission claim. |
| performance | pending | No integrated seek latency/byte-cost benchmark; correctness profile is narrow. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
