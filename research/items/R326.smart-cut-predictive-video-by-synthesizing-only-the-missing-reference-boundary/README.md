<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Smart-cut predictive video by synthesizing only the missing reference boundary

Current decision: **stop_current_profile**. Constrained constant-block MPEG2 exact synthetic reference preserves26copied suffix pictures and temporal_reference9..35; independent whole-suffix pixels match original and full edge reencode. Wrong/missing seed fails. Correctness alone does not justify pursuit:11complete cold preparation/decode/26picture-consumption pairs against originalRAP copy+hiddenpreroll show median105.30%slower, bootstrap95 slowdown52.26–252.91%. OriginalRAP is cheaper faithful baseline because both constructions already hide preroll. Stop this cold host profile.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Constrained constant-block MPEG2 exact synthetic reference preserves26copied suffix pictures and temporal_reference9..35; independent whole-suffix pixels match original and full edge reencode. Wrong/missing seed fails. Correctness alone does not justify pursuit:11complete cold preparation/decode/26picture-consumption pairs against originalRAP copy+hiddenpreroll show median105.30%slower, bootstrap95 slowdown52.26–252.91%. OriginalRAP is cheaper faithful baseline because both constructions already hide preroll. Stop this cold host profile. |
| correctness | passed | 36picture640x360constant-block MPEG2 noB source, cut10. Reencoded exact reference9 followed by unchanged26originalP payloads, explicit I/P and temporal_reference9..35. Host wanted-frame hashes all26exact; wrong-color reference and missing reference fail. Synthetic I is explicitly decoder-only preroll, not presented. All22timed candidate/baseline jobs again consume26exact hashes. No generalized motion/quantization state or browser-native qualification. |
| performance | failed | Predeclared11alternating cold pairs include decode-prefix/seedencode/assembly or originalRAP filecopy, then software decode/hiddenpreroll and26wanted-frame hash consumption. Cheapest faithful RAP-copy baseline; median saving-105.301%, bootstrap95[-252.907,-52.264]% vs+5%gate. Earlier full edge reencode baseline also negative-16.28%. No extrapolation to repeated amortized playback or browser energy. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: Constrained constant-block MPEG2 exact synthetic reference preserves26copied suffix pictures and temporal_reference9..35; independent whole-suffix pixels match original and full edge reencode. Wrong/missing seed fails. Correctness alone does not justify pursuit:11complete cold preparation/decode/26picture-consumption pairs against originalRAP copy+hiddenpreroll show median105.30%slower, bootstrap95 slowdown52.26–252.91%. OriginalRAP is cheaper faithful baseline because both constructions already hide preroll. Stop this cold host profile. |

Next/reopen: Retain originalRAP preroll for this profile. Reopen only with a justified repeated-use/remote-transfer workload where smaller dependency boundary amortizes synthesis, and prove full reference numbering/filter state plus nonpresentation. Do not ship a synthetic visible seed or generalize constant-block exactness.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
