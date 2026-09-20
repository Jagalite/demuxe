<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Mux color and alpha into native transparent WebM

Current disposition: **pursue** for the scoped capability. Correctness **passed**; performance **failed**; other research gates passed.

Same prepared first-picture task with native transparent WebM as candidate. This measures native owner startup, not packet packaging time or whole media conversion. Native transparency capability remains correct; no startup speed benefit. Native alpha output remains correct through current first-picture and retained prior seek/rewind/EOF evidence. Native owner startup is slower than separate decoding on this tiny prepared fixture; do not mistake capability for a latency win. Measured saving -332.65% with bootstrap95 [-354.34783957969086, -308.1632561457253]; predeclared performance gate failed.

Do not pursue native WebM for startup-speed improvement on this fixture; retain its transparent container capability. Reopen performance only for a specified longer-playback or interoperability workload.

[Current record](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json) · [Run analysis](../../shared/runs/20260919T203737Z-presentation-performance/analysis.md)
