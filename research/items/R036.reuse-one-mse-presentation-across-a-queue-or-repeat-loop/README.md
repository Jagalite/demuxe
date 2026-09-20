<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse one MSE presentation across a queue or repeat loop

Current decision: **stop_current_profile**. The source-linked A→B→A queue executes on retained MSE lanes with correct tone changes, seeks and EOF, but independent AAC encoder boundaries still exceed the predeclared5ms quiet-bin gate despite explicit priming correction and append windows. Stop this exact gapless queue recipe before further ownership/performance qualification.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | The source-linked A→B→A queue executes on retained MSE lanes with correct tone changes, seeks and EOF, but independent AAC encoder boundaries still exceed the predeclared5ms quiet-bin gate despite explicit priming correction and append windows. Stop this exact gapless queue recipe before further ownership/performance qualification. |
| correctness | failed | Actual48kAAC source-linked queue captures256quiet samples (5.333ms) around first boundary; gate<=240samples. The64-sample RMS-bin method has1.333ms bin resolution and is not exact acoustic placement. Both buffers appear continuous0–5.999999s, retained identity, tone mapping, reverse/forward seek and EOF pass. Full image, subtitle, real pending source replacement and long bounded eviction remain unqualified because the initial PCM gate failed; no inference that generic MSE queue reuse is impossible. |
| performance | not_applicable | Not applicable after this declared correctness failure; no benchmark or long-run resource claim. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: The source-linked A→B→A queue executes on retained MSE lanes with correct tone changes, seeks and EOF, but independent AAC encoder boundaries still exceed the predeclared5ms quiet-bin gate despite explicit priming correction and append windows. Stop this exact gapless queue recipe before further ownership/performance qualification. |

Next/reopen: Reopen with a sample-accurate independent-encoder boundary construction or an explicitly nongapless queue contract. Repeat the predeclared PCM gate with sufficient temporal resolution before full picture/source-replacement/bounded-retention and complete-cost work.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
