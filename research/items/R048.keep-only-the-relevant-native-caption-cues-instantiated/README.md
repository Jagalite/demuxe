<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep only the relevant native caption cues instantiated

Disposition: **pursue**. Correctness **passed**, performance **passed**; other research gates passed.

Actual native TextTrack window with10000 authored cues and six forward/backward seeks. Both implementations match independent half-open authored interval/text oracle at actual media time; deleting active cue detected. Candidate materializes at most21 cues versus10000 baseline; total memory not measured. Complete video/Blob startup, cue creation and removal, seek with one animation-frame presentation opportunity, output checking, source/URL teardown included. Hidden native cue selection only, no styling or subtitle drawing claim. Complete owner wall-time saving27.02%, bootstrap95[21.6645649461766, 31.765502716631055]; predeclared performance gate passed.

Scoped component research gates complete. Production integration requires a separate owner/workload contract and representative media validation.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T210010Z-cue-witness/analysis.md)
