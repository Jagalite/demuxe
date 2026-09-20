<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Buffer according to predicted decode work

Disposition: **stop_current_profile**. correctness: **passed**, performance: **failed**.

The actual browser predictive scheduler preserves all72 independent host I420 frame hashes and PTS under a fixed one-held-frame23040-byte budget. A real held-output cancellation closes the old frame/decoder, clears the scheduled decode, rejects delayed stale publication, and allows an exact surviving generation. Software packet-byte prediction improved held-out MAE28.10% (95%22.27–33.95); platform prediction worsened17.79%. Those trace statistics are prerequisite evidence, not buffering value. In three alternating real24fps whole-task pairs, both immediate one-frame-lookahead baseline and candidate recorded zero deadlines more than8ms late. Therefore the predeclared opportunity/value gate (baseline at least3 misses, candidate at least20% fewer, no added misses) fails. Candidate additionally calibrates48 frames (47 fit samples after first startup frame) before72 output frames, and calibration/model/copy/hash/presentation/close are charged. Output/owner correctness passes for this isolated profile; stop this tiny easy-workload scheduler variant rather than infer value from prediction accuracy. No production scheduling, hard-region generalization, energy, or physical memory claim.

Next: Reopen with an actual difficult-region workload where the cheapest fixed-budget baseline misses deadlines, then validate prediction/controller benefit including calibration and source ownership. Do not treat a packet-size MAE gain as user-visible buffering improvement.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T213936Z-deadline-controller/analysis.md)
