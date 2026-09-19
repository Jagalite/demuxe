<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Communicate the requested start position before first-data preparation

Current decision: **stop_current_profile**. Reconciled completed prior evidence: Moving this indexed native target seek from loadeddata to loadedmetadata preserves target picture but fetches the same 6296410 bytes and 97 responses; zero-start control passes. No byte-work opportunity demonstrated by this variant; single-run timing differences are not evidence of speedup.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Loadedmetadata and loadeddata seek variants produce identical target pixel hash at20s and zero-start control succeeds with cleanup; scoped native target-seek component. |
| performance | not_applicable | Current variant already stops: both fetch6296410bytes; single-run timing variation cannot justify further benchmark. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
