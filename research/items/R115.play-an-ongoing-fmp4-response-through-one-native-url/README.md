<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play an ongoing fMP4 response through one native URL

Current decision: **stop_current_profile**. The current finite native URL construction cannot combine the already-requested early-output and seek-fidelity gates. Without HTTP ranges, all96 pictures arrive before responseEOF but seeking clamps0 and one buffering-silence interval interrupts PCM. With correct ranges, all pictures,385024 active PCM samples and seeks match, but output waits until responseEOF. Preserve the narrower sequential nonseekable capability as positive; stop this combined recipe, not native progressive media universally.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | The current finite native URL construction cannot combine the already-requested early-output and seek-fidelity gates. Without HTTP ranges, all96 pictures arrive before responseEOF but seeking clamps0 and one buffering-silence interval interrupts PCM. With correct ranges, all pictures,385024 active PCM samples and seeks match, but output waits until responseEOF. Preserve the narrower sequential nonseekable capability as positive; stop this combined recipe, not native progressive media universally. |
| correctness | failed | Independent full-response native playback yields96distinct complete160x96 RGBA pictures; both progressive variants match all96. Non-Range variant has exact decoded PCM order after explicitly removing a measured buffering-silence interval, but three requested seeks(.3,6.3,1.3s) clamp0; cancellation closes pendingresponse and actual truncation/refused resume errors withoutfalseEOF. Range-capable variant preserves all385024activePCM samples exactly and allthree exact seek images, but firstoutput occurs afterresponseEOF. This fails the current combined capability contract; no gapless, endless-live, reconnection or production claim. |
| performance | not_applicable | No timing benefit benchmark after combined route contract fails. Observed first-output/EOF ordering and buffering silence are feasibility diagnostics, not CPU/latency savings. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: The current finite native URL construction cannot combine the already-requested early-output and seek-fidelity gates. Without HTTP ranges, all96 pictures arrive before responseEOF but seeking clamps0 and one buffering-silence interval interrupts PCM. With correct ranges, all pictures,385024 active PCM samples and seeks match, but output waits until responseEOF. Preserve the narrower sequential nonseekable capability as positive; stop this combined recipe, not native progressive media universally. |

Next/reopen: Reopen with a source/delivery profile that demonstrates correct early output and declared seek behavior together, or explicitly choose a sequential nonseekable endpoint accepting measured buffering. Preserve separate transport/cancellation semantics; do not infer low latency from early color/tone alone.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Provenance correction: [late console flush](evidence/20260919T220100Z-late-console-provenance/analysis.md) preserves the final console bytes separately after premature registration of an empty stream. Scientific results and decision are unchanged.
