# Review fixes: verifier lifetime and late capability publication

- Browsers without proprietary audio counters may use an enabled browser audio track
  plus playback progress. Diagnostics explicitly label this weaker presence evidence;
  it is not decoded-sample or physical-output proof. Missing/disabled tracks and a
  clock alone remain insufficient. The browser harness independently checks PCM where
  available and retains its existing WebKit MSE capture exclusions.
- Concurrent playback verification uses an attempt-owned abort signal and settles on
  playback rejection before returning. The same signal reaches selective PCM polling.
- Multi-track MediaCapabilities evidence reconciles late answers before publication;
  an early timeout cannot overwrite a late success while another track is pending.
  The 150 ms startup waiting deadline is unchanged.

Validation:
- 56 focused unit/contract tests passed; the cancellation test was then tightened to
  reject playback after polling starts, and all 26 affected tests passed again.
- Chrome and Firefox: 32/32 passed, run-2026-09-25T18-43-25.608Z.
- WebKit: 16/16 passed, run-2026-09-25T18-44-00.857Z, including AAC and High10.
- Late-answer Chrome browser regression passed.
- TypeScript, 45-file core boundary and whitespace checks passed.

Prior failed runs are retained. These are correctness results, not a new CPU campaign.

Full npm build remains blocked by the existing unrelated SPDX header violation in
experiments/chrome-browser-cpu/diagnose.mjs; TypeScript compilation completed.
