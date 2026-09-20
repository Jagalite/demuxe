<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sequence-mode cross-codec concatenation [report paragraph label]

Current decision: **pursue**. Sequence mode appends the independent VP9/WebM source immediately after AVC/fMP4 on the same SourceBuffer without assigning a manual transition offset. All24 complete images and continuous23 subsequent images plus initial query are exact; stale source publication and actual wrong-codec/container failure with declared rebuild recovery pass.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Sequence mode appends the independent VP9/WebM source immediately after AVC/fMP4 on the same SourceBuffer without assigning a manual transition offset. All24 complete images and continuous23 subsequent images plus initial query are exact; stale source publication and actual wrong-codec/container failure with declared rebuild recovery pass. |
| correctness | passed | Literal report video-only sequence-mode cross-codec concatenation. Independently decoded12+12fullRGBA images, cross-boundary reverse/forward seeks,23continuouscallbackimages with exactPTS-to-source mapping andEOF, sameSB, source-generation replacement, cleanup. Actualwrong initialization rejects; fullownerrebuild restores theoldsource. Not a claimofretainedtransactionalrollback, selectedaudioorAACgaplessness. |
| performance | not_applicable | Source report asks for additional adjacent cross-codec capability, not reduced cost. No speed/memoryclaim or artificialbenchmark required for the bounded capability endpoint. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Sequence mode appends the independent VP9/WebM source immediately after AVC/fMP4 on the same SourceBuffer without assigning a manual transition offset. All24 complete images and continuous23 subsequent images plus initial query are exact; stale source publication and actual wrong-codec/container failure with declared rebuild recovery pass. |

Next/reopen: Bounded report capability complete. Reopen for selected A/V or maintained ownership integration; keep audio priming and post-fatal-error recovery as separately scoped requirements.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
