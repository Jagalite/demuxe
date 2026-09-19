<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play an exact requested excerpt without re-encoding its edge GOP

Current decision: **pursue**. Original-coded B-frame AVC/FLAC fragment window with preroll yields exact full-source excerpt pictures and206400PCM samples for[3.35,7.65). Independent packet payload/timing oracle passes; dropping needed preroll diverges.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored or reused hashed synthetic fixture, executable component and independent reference/control for scoped screen. |
| screen | passed | Original-coded B-frame AVC/FLAC fragment window with preroll yields exact full-source excerpt pictures and206400PCM samples for[3.35,7.65). Independent packet payload/timing oracle passes; dropping needed preroll diverges. |
| correctness | pending | Host excerpt packet/picture/PCM oracle passes, but public browser presentation boundaries and lifecycle are required by full item contract. |
| performance | pending | No equivalent-work benchmark or owner opportunity measurement. |
| results | passed | Immutable positive/negative evidence and manifests registered. |
| decision | passed | Scoped pursue; remaining gate and actual owner opportunity explicit. |

Next: Implement public presentation start/end suppression and run browser pause/replay/cancel and appendWindowStart broken-preroll control; host trim oracle is not public playback qualification.

[Contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
