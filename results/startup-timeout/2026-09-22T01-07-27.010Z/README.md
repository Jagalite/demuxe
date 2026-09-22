<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Local Native load timeout recovery

Firefox 156.0, separate temporary profile, headless. Source: `/Volumes/seed2/Projects/startup-repro/stuck.mkv` (480746298 bytes, H.264/AAC, 464.708 seconds).

The natural direct-load timeout reported by the user was not reproduced in the fresh profile: direct preparation took about 9.35 seconds. A forced-remux control played and sought successfully. This run deliberately withheld direct readiness and shortened its deadline to 100 ms, exercising the production timeout and automatic recovery with the real source. Native remux rendered 29 frames, advanced to 1.224 seconds, and sought to 120 seconds. Total open/play/pause/seek sequence: 3343 ms; this is not a production startup benchmark or physical audiovisual qualification.

The captured `result.json` retains the interrupted direct trial as untested, with no codec incompatibility cached. Network, cancellation and disabled-remux controls are covered separately by `tests/native-load-timeout.mjs`.

With the development server running on port 4179, replay into a new timestamped result directory using `node reproduce-installed-firefox.mjs`. The script requires the source path above and installed Firefox; it creates an isolated profile. Original source media was not modified.

## Validation

`npm run build` passed, including licensing checks. `node tests/native-load-timeout.mjs` passed all five cases (local loadeddata recovery, metadata recovery, terminal remote timeout, disabled remux, cancellation), including frame/clock progress, fresh direct reopening and worker cleanup. Results: `../contracts-2026-09-22T01-09-06.017Z/result.json`. The 19 Native selection, plan admission and tier policy tests passed; scoped `git diff --check` passed.
