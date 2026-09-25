# Conservative capability and runtime verification corrections

Static evidence now records serialization completeness separately from token presence.
PCM family tokens remain incomplete regardless of browser answer. Matroska uses both
video/matroska and video/x-matroska; incomplete or uncertain queries cannot veto a route.
Direct, MSE and component-decoder evidence remain separate.

Native no longer rejects an instantaneous zero decoded-audio counter during paused
preparation. Output verification runs concurrently with play and retains its 10-second
deadline. Clock-only output cannot qualify audio; byte observations and deltas are
reported. Paused preparation remains distinct from output verification. Automatic
local-file output timeouts may try another admitted route without caching incompatibility;
remote timeouts, authorization and autoplay failures remain terminal. Unverified trials
preserve their original playback position on fallback.

Validation:
- 52 focused unit/contract tests passed, including delayed audio, clock-only rejection,
  and local versus remote/permission timeout boundaries.
- Chrome/Firefox: 31 cases passed in run-2026-09-25T18-36-46.924Z. DTS fell back correctly
  but the harness read the retired media-element meter. After correcting ownership,
  the DTS case passed in run-2026-09-25T18-38-35.677Z (32 cases covered in total).
- Late-answer browser regression passed.
- TypeScript, core boundary (45 files), and diff whitespace checks passed.
- WebKit spot checks: PCM24 passed; AAC fallback hit terminal autoplay permission rejection.
  High10 stalled and the run was interrupted; WebKit is not qualified by this change.
  Evidence: run-2026-09-25T18-37-13.722Z. Earlier failed runs are retained.
- Full build remains blocked by the unrelated existing SPDX header violation in
  experiments/chrome-browser-cpu/diagnose.mjs.

No CPU improvement claim is made from these correctness tests.
