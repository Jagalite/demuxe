<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep decoded video on the native overlay/display path

Disposition: **blocked (setup)**. Physical display and Instruments are available; source-to-surface attribution remains unresolved.

Fresh owned headful Chrome 152 on Apple M1 / ANGLE Metal and the online built-in 2560x1600 Color LCD establishes that the former physical-display-absent/headless-only prerequisite description is stale. Expanded Chrome tracing records 95 Display::FrameDisplayed events, 95 native CoreAnimation commits and scheduled overlay layer count 9; these are not hardware promotion or source-frame scanout proof. Actual Instruments Metal System Trace succeeds after increasing startup budget from 25 to 75 seconds; the first timed-out incomplete trace is retained, not called permission denial. Exported displayed-surfaces-interval has 260 physical surface intervals and Direct to Display=false for all, but no Chrome source attribution: generic compositor surface labels and some unrelated process labels, no source VideoFrame/PTS identity. Surface queue export has swap IDs, no source mapping; ca-client-present-request and compositor-event tables have schemas but no rows. Therefore neither overlay eligibility nor source-frame cadence has passed or failed. Physical telemetry is accessible; the remaining prerequisite is a controlled foreground source-to-IOSurface mapping and application-owner comparison, a setup gap, not absent GPU, absent display, or an experimental negative. Browser and owned recorder are closed. No power, subtitle composition, custom presenter cadence, fidelity or comparative performance claim.

Next: Implement a source-frame/PTS to IOSurface attribution bridge and compare native video against equivalent canvas presentation on this actual display; validate promotion plus output before a cost comparison.

[Current record](item.json) · [History](history.jsonl) · [Evidence](evidence/20260920T005445Z-physical-surface-attribution/analysis.md)
