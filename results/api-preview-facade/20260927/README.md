<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Player preview facade validation

Scope: roadmap slice 1A, on `e7a8d02d126e381b50af9836b202f3d5186082ea` plus the existing local watchdog work. No route defaults or decoder implementation changed. This is API/lifecycle evidence, not new codec or performance qualification.

## Passed

- `npm run build`: TypeScript/declarations, Shaka asset verification, license and core dependency checks.
- 71 Node contracts across preview, facade, pregeneration, range-reader integration, public state, Shaka backend, and Shaka networking. Includes a compile-only consumer checking positive and negative public type access.
- Chrome 153.0.8010.53: preview extraction/facade lifecycle, UI, options/pregeneration, software preview, and Shaka preview suites.
- Chrome public API suite: 21/21 checks, including Native/Hybrid/Software playback, failed replacement, cancellation at acceptance, stale backend events, and teardown.
- Firefox 146.0.1: preview extraction/facade lifecycle, UI, options/pregeneration, and Shaka preview suites.
- Diff whitespace checks. Existing dirty backend source/generated files were compared with the pre-edit snapshot and preserved.

## Exceptions and diagnostic comparisons

The Chrome component suite passed 48/50 checks. Two existing demo tests timed out waiting for controls to become idle after clicking Play. The demo has `autoplay`; the click instead pauses an already playing session. A focused comparison with saved pre-edit `unified-player.js` and the changed runtime reproduced `play` before the click and `pause` afterward in both. The component tests and autoplay behavior were not changed by this patch. Full-suite output and the focused comparison are retained here.

The ordinary Firefox software-preview harness did not pass consistently: runs failed with a missing first preview, a preview request deadline, and later automatic source-inspection timeout. Saved pre-edit runtime comparisons using request interception passed, but that interception also disables HTTP caching. Consequently those initial comparisons cannot establish a regression or absence of one. A follow-up comparison uses the same interception in both cases; both runtimes passed the complete software-preview harness under that condition. Preserve these failures as an unresolved ordinary-harness reproducibility limitation; do not report an unconditional Firefox software pass or infer caching as the cause.

The software harness generates and removes an FFV1/PCM fixture with its documented FFmpeg command. It is not the user's media file. `sha256.json` records reviewed source/runtime files and the maintained MP4 used by browser/public API checks. No CPU measurements were made.

## Evidence

`checks.json` records the ordinary browser runs and their log files. `demuxe-preview-contracts-final.log` records the final Node run. Logs retain failed as well as successful runs. `demuxe-facade-component-baseline.json` records the focused autoplay comparison. `demuxe-facade-firefox-*-matched.log` records the comparison with equivalent request interception; the same current non-Player runtime and test harness were used with saved versus changed Player JavaScript. This is a targeted Player comparison, not a clean release-build comparison.

The new contracts are included in `npm run test:preview` and the existing CI workflow. Remote CI, package publication, commits, and pushes were not performed.
