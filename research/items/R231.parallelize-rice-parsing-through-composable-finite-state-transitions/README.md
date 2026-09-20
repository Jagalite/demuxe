<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize Rice parsing through composable finite-state transitions

Full key: `R231.parallelize-rice-parsing-through-composable-finite-state-transitions`

Current decision: **stop_current_profile** (2026-09-20T00:00:04.207115+00:00).

Actual Rice0 residual payload from one60001sample fixed1FLAC frame: four spawned workers summarize completed unary runs and leading/trailing carry, then compose to60000 signed residuals exactly. Independent FFmpeg PCM equals original60001samples. Chunk sizes1/7/251/8191 and long unary across a boundary pass; omitted carry and truncated final code controls detect. Five alternating cold payload read/hash, process startup/transfer/summary/composition/cleanup98.521ms vs serial loop3.991ms ratio24.686 fails0.9. This is parameter0 only, not a generic Rice-k parser.

Stop this process-based Rice0 chunk parser on cost. The composable boundary mechanism is real, but no speedup in this fixture; wider symbol/state support or a compiled shared-memory implementation needs new correctness and complete cost evidence.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260920T000004Z-rice-scan/run.json) · [Analysis](../../shared/runs/20260920T000004Z-rice-scan/analysis.md) · [Manifest](../../shared/runs/20260920T000004Z-rice-scan/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
