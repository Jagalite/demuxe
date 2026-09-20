<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Sequence mode appends the independent VP9/WebM source immediately after AVC/fMP4 on the same SourceBuffer without assigning a manual transition offset. All24 complete images and continuous23 subsequent images plus initial query are exact; stale source publication and actual wrong-codec/container failure with declared rebuild recovery pass.

Correctness: Literal report video-only sequence-mode cross-codec concatenation. Independently decoded12+12fullRGBA images, cross-boundary reverse/forward seeks,23continuouscallbackimages with exactPTS-to-source mapping andEOF, sameSB, source-generation replacement, cleanup. Actualwrong initialization rejects; fullownerrebuild restores theoldsource. Not a claimofretainedtransactionalrollback, selectedaudioorAACgaplessness.

Performance: Source report asks for additional adjacent cross-codec capability, not reduced cost. No speed/memoryclaim or artificialbenchmark required for the bounded capability endpoint.

Next/reopen: Bounded report capability complete. Reopen for selected A/V or maintained ownership integration; keep audio priming and post-fatal-error recovery as separately scoped requirements.

Bounded research result, not production or release admission.
