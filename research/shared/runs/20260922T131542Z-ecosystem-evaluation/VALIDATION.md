<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Validation and limits

- 76 existing Node contract tests passed; three new synthetic boundary probes passed.
- Run-specific integrity/integration verifier passed for all 22 proposals, 19 preserved parent decisions and three new homes; 109 artifact hashes checked.
- License/SPDX and core dependency boundaries passed; tracked diff and new run whitespace checks passed.
- Original imported report matches HEAD byte for byte. Existing evidence-reference arrays and decision/history prefixes are preserved. Changes are confined to research.
- Full repository verification reports **15 inherited failures across 11 unchanged paths**, covering old JSPI artifacts and historical runtime/source hashes. See [raw verification](repository-verification.json). None is a new evaluation artifact; the run-specific verifier passes. Historical hashes were not rewritten.
- No new browser playback, codec conformance, performance or physical A/V qualification. No production integration or routing changes. Work remains local and uncommitted.

Recheck this run from the repository root with `python3 research/shared/runs/20260922T131542Z-ecosystem-evaluation/verify.py`. Source pinning deliberately reports drift if future code changes; append a new run instead of rewriting this evidence.
