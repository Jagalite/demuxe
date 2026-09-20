<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sidecars that let decoding start halfway through an entropy-coded slice

Full identity: `R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice`.

Current decision: **stop_current_profile** (actual_full_stream_entropy_translation_and_full_slice_restart).

Complete pointer-free macroblock checkpoints now restart full CABAC slice grammar in fresh processes, preserve all 78 independently reconstructed I/P pictures, and pass source/integrity/neighbor/cancellation controls. Whole-job preparation plus four restores/reconstructions costs 1.477290x uninterrupted baseline, failing <=0.9; 24 source-bound midpoint records total 5,548,281 bytes for 63,404 source bytes. This is the full entropy-restart workflow, not residual-only timing. Prefix syntax and complete reference/picture reconstruction remain charged.

Next action: Stop the measured JSON/full-prefix-syntax profile. Reopen only for a compact complete-state representation or real repeated partial-entropy workload that can beat full decoding after charging preparation, retained references, serialization and complete-picture correctness.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Restricted actual 4:2:0 I/P CABAC input, exact quantized syntax and independently reconstructed output contract, adverse controls and <=0.9 whole-job threshold declared before measurement. |
| prepare | passed | Pinned MIT parser, original writer/checkpoint extensions, independent FFmpeg oracle, four generated profiles and cold clean locked build verified. |
| screen | passed | Real quantized CABAC syntax translated to CAVLC and full mid-slice macroblock parsing restarted in new processes; no fallback or pixel encoding in translation. |
| correctness | passed | 78 exact independently decoded pictures and matching original quantized syntax; fresh-process complete-slice restores, multiple boundaries, wrong coefficient/state/source and interruption controls passed. |
| performance | failed | Final rebuilt eight alternating equivalent complete-job pairs, predeclared <=0.9 median ratio: 1.477290; observed range 1.074346–1.958123; initial generation and four restores charged. |
| results | passed | Complete pointer-free macroblock checkpoints now restart full CABAC slice grammar in fresh processes, preserve all 78 independently reconstructed I/P pictures, and pass source/integrity/neighbor/cancellation controls. Whole-job preparation plus four restores/reconstructions costs 1.477290x uninterrupted baseline, failing <=0.9; 24 source-bound midpoint records total 5,548,281 bytes for 63,404 source bytes. This is the full entropy-restart workflow, not residual-only timing. Prefix syntax and complete reference/picture reconstruction remain charged. |
| decision | passed | Complete pointer-free macroblock checkpoints now restart full CABAC slice grammar in fresh processes, preserve all 78 independently reconstructed I/P pictures, and pass source/integrity/neighbor/cancellation controls. Whole-job preparation plus four restores/reconstructions costs 1.477290x uninterrupted baseline, failing <=0.9; 24 source-bound midpoint records total 5,548,281 bytes for 63,404 source bytes. This is the full entropy-restart workflow, not residual-only timing. Prefix syntax and complete reference/picture reconstruction remain charged. |

[New run](../../shared/runs/20260920T040000Z-entropy-full-slice/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
