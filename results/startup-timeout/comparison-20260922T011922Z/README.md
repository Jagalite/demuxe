<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Local Matroska startup comparison

For inspected local Matroska with an admitted original-packet Native remux route, cap the direct readiness trial at 1500 ms. Other containers, remote media, seek waits and disabled/ineligible remux keep their existing deadlines. The interrupted direct trial remains inconclusive, not cached codec incompatibility. No user-agent or filename routing is used.

Same unmodified `stuck.mkv`, fresh browser profiles, serial runs. Firefox 156 direct controls opened in 4.344 and 5.156 seconds (an earlier control took 15.313 seconds); automatic bounded trials opened in 2.635 and 2.444 seconds using Native remux. Chrome 152 retained direct playback: 1.174 seconds before and 0.503 seconds afterward. Host and file-cache conditions varied; these are small local samples, not a universal speedup claim. Remux-only Firefox control: 1.276 seconds.

Both Firefox candidate runs rendered 29 frames, advanced playback and sought to 120 seconds. Open timing excludes browser launch and file-picker automation, and ends at paused preparation; playMs adds actual playback verification. All original raw runs are referenced and hashed in results.json. No audio sample-fidelity or physical-output claim is made.

Reproduce with the server on port 4179: `node firefox.mjs`, `BASELINE=1 node firefox.mjs`, and `node chrome.mjs`. Scripts require the recorded local source and installed browsers; each writes a new timestamped result directory. BASELINE changes only the direct readiness budget back to 25 seconds in the test instance.

Validation: npm build/licensing passed; all 8 timeout/budget browser cases and 19 selection/admission/tier tests passed; scoped diff whitespace check passed.
