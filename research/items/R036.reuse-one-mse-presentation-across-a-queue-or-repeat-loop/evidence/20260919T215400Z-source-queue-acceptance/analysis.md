<!-- SPDX-License-Identifier: CC-BY-4.0 -->

The source-linked A→B→A queue executes on retained MSE lanes with correct tone changes, seeks and EOF, but independent AAC encoder boundaries still exceed the predeclared5ms quiet-bin gate despite explicit priming correction and append windows. Stop this exact gapless queue recipe before further ownership/performance qualification.

Correctness: Actual48kAAC source-linked queue captures256quiet samples (5.333ms) around first boundary; gate<=240samples. The64-sample RMS-bin method has1.333ms bin resolution and is not exact acoustic placement. Both buffers appear continuous0–5.999999s, retained identity, tone mapping, reverse/forward seek and EOF pass. Full image, subtitle, real pending source replacement and long bounded eviction remain unqualified because the initial PCM gate failed; no inference that generic MSE queue reuse is impossible.

Performance: Not applicable after this declared correctness failure; no benchmark or long-run resource claim.

Next/reopen: Reopen with a sample-accurate independent-encoder boundary construction or an explicitly nongapless queue contract. Repeat the predeclared PCM gate with sufficient temporal resolution before full picture/source-replacement/bounded-retention and complete-cost work.

Bounded research result, not production or release admission.
