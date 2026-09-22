<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Limit live work by dependency-group deadlines, not VOD policy

Stable key: `live-dependency-group-deadlines`. Origin: EB21.

Decision: **stop_current_profile**, bounded source review only.

Live playback already requires explicit Shaka permission; the byte reader is finite VOD. No maintained MoQ dependency-group consumer or loss policy is present in the inspected owners. Existing R208 cancellation and R267 deadline attribution do not authorize dropping required VOD content.

Next action: Reopen for an explicit live transport/latency policy outside the current packaged-stream owner. Test late groups, dependency closure, pause/resume, A/V/subtitle resync and a strict VOD no-drop control; report skipped intervals and latency, not equal-output savings.

Correctness contract: No display of dependent frames without their closure; skipped intervals reported; timeline and audio/subtitles resynchronize; VOD control retains required content.

No browser/media candidate or performance measurement was executed.

## Ecosystem follow-up EB21

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **deferred_until_trigger**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

Live playback already requires explicit Shaka permission; the byte reader is finite VOD. No maintained MoQ dependency-group consumer or loss policy is present in the inspected owners. Existing R208 cancellation and R267 deadline attribution do not authorize dropping required VOD content.

Next gate / reopening condition: Reopen for an explicit live transport/latency policy outside the current packaged-stream owner. Test late groups, dependency closure, pause/resume, A/V/subtitle resync and a strict VOD no-drop control; report skipped intervals and latency, not equal-output savings.

This scoped supplement does not broaden earlier correctness or performance qualification.
