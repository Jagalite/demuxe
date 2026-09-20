<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fan one decoded VideoFrame into several workers without copying its pixels up front

Disposition: **inconclusive**. Correctness **passed**, performance **failed**; other research gates passed.

Two worker ROI consumers of12frames; cloned transferable frames versus upfront canonical CPU plane copies and reconstructed frames. Both share one decoded source. All24 worker output plane hashes match independently cropped FFmpeg planes. Actual held-frame cancellation closes before release, stale work suppressed, newgeneration succeeds. Bounded2leases and zero at teardown; workers terminated and URLs revoked. Candidate upfront application plane copy0 versus110,592bytes; this is not proof of physical zero copy. Complete owner wall-time saving28.90%, bootstrap95[-12.499999923662086, 56.27450994852183]; predeclared performance gate failed.

Research experiment complete with no demonstrated latency value in this cold-worker tiny fixture. Reopen only for a specified persistent-worker or larger-source workload where ownership/copy savings can outweigh worker setup; declare new costs and threshold before measuring.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T204922Z-presentation-ownership/analysis.md)
