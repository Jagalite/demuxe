<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Out-of-order GOP decode and reverse presentation

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Implemented bounded independent-region decode/cache/reverse presentation for four12-frame closed H264 GOPs in one64x48source. ActualIDR NAL checks validate everyentry; non-RAP start13 rejects. Decodeorder3→1→2→0 retains exactly48 frames under221184visible-plane-byte cap; reverse delivery47→0 copies/hashes every fullI420 frame against independent fullhostdecode and draws tocanvas without further decode/seek. AllPTS/IDs are exact andframesclose. A separate boundedtwo-decoder schedule also retains all48; it does not erase historical four-native-capture stress losses. Actual sourceepoch replacement duringdecode discards12 oldframes, preserves12 exactnewsource-epoch outputs, and closesall24. Removing finalrequestedID47 makes completenessfail. This exact report key proposes a new bounded reverse-preview capability, not a concurrentdecode speedup; performance is not applicable and diagnosticwalltimes are not a benchmark. Tiny64x48, noB/openGOP, headlessdrawAPI rather than physicalscanout, nofullpreviewservice orproductionadmission claim.

Next: Scoped bounded reverse-preview capability verified. Reopen separately for larger byte budgets, B/openGOP dependencies, media-element capture, physical display or production scheduling; retain historical missingframe stressnegative.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T222505Z-bounded-regions/analysis.md)
