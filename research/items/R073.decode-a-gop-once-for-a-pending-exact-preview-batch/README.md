<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode a GOP once for a pending exact-preview batch

Disposition: **pursue**. correctness: **passed**, performance: **passed**.

Implemented a browser owner for seven already-pending exact consumers (including duplicate frame13) in one closed720p48-picture GOP. Decodeonce candidate returns an independently owned VideoFrame clone perconsumer, all hostFFmpeg I420 hashes/PTS exact. Canceling one queuedconsumer suppresses only that output; six survivors remainexact. Different-source, nonpending andout-of-index jobs reject; allframes/decoderclose andpeakownership<=16. Baseline is one persistentVideoDecoder object reset/configured perrequest, not sevenprocesslaunches. Candidate submits38packets vs152 baseline, without wait-to-fill, approximate selection, droppedduplicate orcachehit. Nine alternating wholeownerpairs include config/decode/clone/copy/hash/reset/flush/close: 301.467→213.600ms, saving29.15%,95%[25.627240149897755, 31.985735468520282], passes10%lower-boundgate. Fixedpreparedsame-source/configclosedGOP; source-epoch changes are rejected/fallback boundaries, not cross-source sharing or integratedplayer admission.

Next: Scoped pending-only same-GOP component gates complete. Keep independent consumer ownership/cancellation and persistentdecoder baseline. Additional GOP/source/config families or actualpreviewservice integration require new exact eligibility and output tests.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T220758Z-pending-batch/analysis.md)
