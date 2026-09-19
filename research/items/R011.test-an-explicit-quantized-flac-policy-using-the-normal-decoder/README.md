<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Test an explicit quantized-FLAC policy using the normal decoder

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current FLAC path requires established integer precision and rejects unqualified conversion. allowLossy applies Opus, not an explicit float quantization/error policy. Float-to-24-bit FLAC needs a separate requested fidelity contract; it must not weaken sample-exact admission.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define a research-only float quantization contract on one in-range signal plus out-of-range rejection and compare against the same normal float decoder.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
