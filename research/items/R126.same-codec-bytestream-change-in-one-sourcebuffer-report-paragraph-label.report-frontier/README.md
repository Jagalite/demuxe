<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Same-codec bytestream change in one SourceBuffer [report paragraph label]

Current decision: **pursue**. Actual same VP9 codec WebM-to-fMP4 changeType keeps SourceBuffer and renders both marked intervals to EOF; invalid type rejected. Video-only component; current combined A/V controller not integrated.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | VP9 WebM→fMP4 changeType renders expected interval colors, EOF and invalid MIME rejection; no full-frame/timing/A/V boundary oracle. |
| performance | not_applicable | Explicit same-codec byte-stream capability; full fidelity remains next gate, no speed claim. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
