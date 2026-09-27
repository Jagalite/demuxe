<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Integration qualification — 2026-09-27

Implementation base: `f68c1b1bc0e2ee0f3a6b41e890add5c54e30280d` plus the
integration working-tree changes identified in [hashes.json](hashes.json).
No commit or push was requested for this increment. Unrelated README/research work
was preserved. Original API qualification remains in the prior reports; these
results do not retroactively change it.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Integration + retained API Node contracts | 67/67 passed | [node.log](node.log) |
| Public package TypeScript consumer | Passed; no diagnostics | [types.log](types.log), `tests/integration-types.ts` |
| Chrome external profiles | Both passed within scope | [raw result](../chrome-1790526817762/result.json), [log](chrome.log) |
| Firefox external profiles | Both passed within scope | [raw result](../firefox-1790526878245/result.json), [log](firefox.log) |
| Built-in presentation/lifecycle | Passed focused scenario | [raw result](../presentation-1790526461430/result.json), [log](presentation.log) |
| TypeScript emit, generated headers | Passed | Final `npx tsc`; maintained-source generated SPDX check passed |
| Licensing and reusable dependency boundary | Passed | [licenses.log](licenses.log); new integration source headers also checked explicitly |
| Scoped whitespace check | Passed | `git diff --check -- src docs tests package.json package-lock.json .github` |

Node command:

```sh
node --test tests/integration.mjs tests/roadmap-contracts.mjs tests/shaka-backend.mjs tests/preview-facade.mjs tests/public-api-state.mjs tests/track-policy.mjs tests/plan-admission.mjs
```

Reproduce integration checks with `npm run test:integration`, and run Firefox with
`BROWSER=firefox node tests/integration-browser.mjs` after building.

## Versions, source, and profile

- Demuxe package 0.3.0-beta.4; dirty integration revision pinned by source/module
  hashes above. Each final external-profile result also records tested generated
  modules, fixture, host package files and Hybrid/Software Wasm hashes.
- Media Chrome 4.19.2 and Video.js 8.24.1, exact installed development dependencies.
  Browser tests route pinned CDN URLs to those installed package files.
- Chrome 153.0.8010.53 and Firefox 146.0.1, headless, Darwin arm64.
- `scripts/serve.mjs`, COOP/COEP response headers enabled. No new JSPI, Asyncify,
  isolation-free or Safari qualification is claimed.
- Fixture: maintained `fixtures/example.mp4`, H.264 + AAC, 640×360, 12.011 seconds.
  SHA-256 `6c9cac6f4212f470d79a9f829f29ba459e6c3e401fab9feb6d757a10a507404c`.
- Actual initial plan is `native-direct` in each raw result. Tests request and
  complete Native → Hybrid → Software → Native changes with the same host/source.

Both profiles exercise real host-library play/pause buttons, mute/volume/time
commands, visible operation rejection, failed-source rollback, route changes,
borrowed disposal, continued canonical playback, and remount. Media Chrome also
exercises complete-controller fullscreen and hidden/resized CSS layout. Neither
profile enables a second caption renderer, source opener, ABR owner, preview
controller, loop timer, or decoder.

The focused built-in scenario verifies complete-element fullscreen (including
shadow-DOM ancestry), target rejection, hidden/resized layout without source
replacement, independent idle second instance, and immediate owned destruction
with joined host removal. It preceded the final Video.js-only terminal-host guard;
that guard is covered by the final Node tests and final external-profile runs.

## Matched observations

Each profile compares the same paused Native player before attaching controls,
after attaching, and after disposing, with warm host imports and 300 ms per phase.
Position stays at 1 second, volume at 0.4, mute enabled, and the canonical plan
unchanged. This check exposed and fixed Video.js's default-volume initialization
write, which otherwise changed borrowed state on remount.

For both browsers and both profiles:

- Core subscriptions: 0 → 1 → 0.
- Observed new media workers and fixture requests across remount: 0.
- Observed active `setInterval` timers: 0 in these paused intervals; interception
  was installed before host imports. This does not characterize active-playback
  UI timers or all scheduling mechanisms.
- CPU, heap, timeout/RAF scheduling, rendering cost, energy and physical output
  latency: **not measured**. These short observations are not a performance
  benchmark or a zero-overhead claim.

## Deviations and remaining scope

The [versioned profile contract](../../../docs/API-INTEGRATION.md) defines accepted
intent, canonical command completion, unknown ranges/duration, nonfatal setter
errors, application-owned sources and the opaque Video.js session identifier.
No native readiness, canplaythrough, native cue list, real-frame callback, output
sink, casting or DRM facade is advertised. Video.js controls must await ready;
its bootstrap volume default does not become an application command.

Streaming-source adapter campaigns, authored ASS/bitmap composition through each
external fullscreen layout, broad accessibility/screen-reader testing, active
playback overhead, and prolonged teardown stress are **not run**. Retained rich
API tests cover some underlying services; they do not substitute for those
external-profile campaigns. Previously reported component-suite and Firefox
software-preview limitations remain historical unresolved evidence.

INT-08 and INT-10 remain demand-driven/deferred as specified by the input plan.
Earlier local result directories preserve unsuccessful setup attempts and the
remount regression. Only the final linked runs establish the scoped passes above.
