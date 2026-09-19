<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use a source-bound seek map rather than repeated fragment scanning

Current decision: **pursue**. Finite source-bound fragment map selects exact packet payload/timing and yields independently verified excerpt; same-name changed-source token, outside offset and corrupted offset reject. Full cold source scan cost recorded.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored or reused hashed synthetic fixture, executable component and independent reference/control for scoped screen. |
| screen | passed | Finite source-bound fragment map selects exact packet payload/timing and yields independently verified excerpt; same-name changed-source token, outside offset and corrupted offset reject. Full cold source scan cost recorded. |
| correctness | passed | Scoped immutable fragment lookup correctness: source/span integrity controls plus independent packet, picture andPCM oracle. Does not qualify asynchronous index service or prove current owner opportunity. |
| performance | pending | No equivalent-work benchmark or owner opportunity measurement. |
| results | passed | Immutable positive/negative evidence and manifests registered. |
| decision | passed | Scoped pursue; remaining gate and actual owner opportunity explicit. |

Next: Trace real repeated distant seeks and existing FFmpeg index use before adding another owner; test source-version changes during asynchronous reads, map config/RAP coverage and incremental useful-read construction.

[Contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
