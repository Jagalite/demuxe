<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share one native decoder across unrelated independent-picture jobs

Disposition: **pursue**. Correctness **passed**, performance **passed**; other research gates passed.

Six compatible independent H264 IDR jobs, same configuration and duplicate external timestamps, unique internal dispatch times. Shared owner returns all six exact host hashes versus six owners. Middle canceled result discarded; malformed decode fails and fresh owner recovers; incompatible configuration and stale source-generation commit guards reject. No live midstream reconfigure or unrelated codec sharing claim. Complete owner wall-time saving62.05%, bootstrap95[56.521738502678595, 67.30769258690539]; predeclared performance gate passed.

Scoped component research gates complete. Production integration requires a separate owner/workload contract and representative media validation.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T204922Z-presentation-ownership/analysis.md)
