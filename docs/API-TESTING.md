# Public API stabilization tests

API stability requires more than successful imports or playback of one fixture. The maintained gate combines public contracts, action sequences, rendered controls, real playback, and resource retirement. Membership is explicit in `tests/api-stability/suites.mjs`; `public-surface.json` records exported names and public class/interface members across all seven entrypoints. Changing the inventory requires reviewing the corresponding tests. The inventory is a drift check, not a claim that every behavior or type signature has been exercised.

## Coverage and execution

| Surface | Contract checks | Browser scenarios |
| --- | --- | --- |
| Core Player, sources, normalized state, events and errors | Public state, roadmap, route admission, startup recovery, queue cancellation, track policy, buffering and source readers | Native, Hybrid and Software operations; replacement/rollback; cancellation; output readback; repeated close/reopen/destroy |
| Preview controller and owned facade | Ownership, cancellation, cache limits, unload, strategies, pregeneration, range reads and scrubber scheduling | Hover during playback; seek/replacement; local/software/authored previews; optional preview failure |
| Presentation | Existing roadmap ownership/race contracts | Fullscreen, PiP capability behavior, host preservation, layout and disposal |
| Player element | Public declaration inventory and preview interaction contracts | Keyboard, source picker, URL form, queue, titles, labels, accessibility semantics, layouts, remount and independent instances |
| Advanced settings and filters | Twenty-four browser DOM contract scenarios using a controlled public API boundary | Actual filter application and mirrored pixels, rejected-filter rollback, gain during playback, ranges, loops and source replacement |
| Playback contracts and integration bindings | Consumer typechecking, selector behavior, borrowed/owned disposal and observer isolation | Binding → media element → seek → replacement sequences; Media Chrome and Video.js controls |
| Streaming controls | Shaka policy/backend/network contracts | Portable HLS roadmap scenarios for quality, audio/attachment identity and live navigation; DASH preview images |
| Components and deployment | Recipes, provider selection/acquisition/ownership, resource loading and asset deployment | Existing installed-provider bundle tests, both assets and embedded deliveries |

`Public API contracts` runs on pushes and pull requests. It builds TypeScript in CI, checks the core package declaration boundary, executes the contract manifest and consumer typechecks, and independently runs the advanced-control contracts in Chromium and Firefox without building engines.

An isolated negative-control step removes the advanced lifecycle guards from the generated test runtime, requires the four corresponding regressions to fail, and restores the bytes in a `finally` block. Timeouts, page errors, unrelated failures and unexpected passes do not count as successful detection. These intentionally failing reports are stored separately from qualification results.

`Provider bundle loader` reuses the fresh source-provider inventory for six API browser shards in Chromium and Firefox. All served package bytes are checked against the bundle manifest before execution. These jobs exercise the assets delivery; the existing bundle jobs exercise both assets and embedded delivery. Source candidate provider admission remains recorded as such and does not become release qualification merely because a test passes.

The weekly provider workflow increases lifecycle repetitions and browser sequence length, with a recorded seed derived from the workflow run number. PRs use a fixed seed. Deterministic contract histories cover 16 fixed seeds, each with 120 actions. Each round shuffles every action, so coverage does not depend on random selection luck. Failure messages preserve the seed and executed action prefix for reproduction.

The expected-state model updates its expectations from accepted commands, independently of player readback. It checks settings, intent, settled status, source lifetime and rollback after every action. Contract histories include rejected buffering changes and retired bindings. Browser histories run two seeds in each of Automatic, Native, Hybrid and Software: 39 actions per history normally, 130 weekly, plus recorded seeks to avoid EOF. Actions include previews, replacement, close/reopen, borrowed bindings, invalid commands and overlapping play/pause bursts and competing latest-wins seeks.

Every browser step checks source identity and route stability. Playing must advance both the playback clock and video pixels; paused playback must keep both stable. Reports contain the seed, action prefix, expected state, observed state and output measurements. These checks establish video behavior for the synthetic fixture, not audio fidelity or coverage of every possible sequence. New model scenarios require CI validation before being counted as passing evidence.

## Commands

Run these in CI or another authorized validation environment. They are not instructions to override a no-local-build/test restriction.

```sh
npm ci --ignore-scripts
npm run build
npm run build:components
npm run test:stability
```

Browser jobs first download and verify `source-provider-browser-inputs`, then run `scripts/prepare-bundle-ci.mjs` and `tests/api-stability/fixtures.mjs`. With those prerequisites:

```sh
BROWSER=firefox DEMUXE_RUNTIME_ROOT=build/bundle-flexibility/ci-assets/assets \
  npm run test:stability:browser -- sequences
```

Other shards are `core`, `ui`, `integration`, `preview`, and `streaming`. `API_EXTENDED=1` increases repetitions; `API_SEED` selects the browser history. Fixtures are generated from FFmpeg test patterns, with commands and hashes retained. They require no personal media library or previous benchmark campaign.

After an intentional API change, review coverage and refresh the static inventory with `node tests/api-stability/surface.mjs --write`. This parses source without emitting builds or executing tests. Consumer typechecks separately cover representative signatures, typed events and forbidden preview owner operations.

## Failure and evidence rules

- Zero browser pages, unexpected page errors, crashes, failed cases and incomplete structured reports fail the gate. Suite deadlines include child servers and browsers; timeout is failure.
- Arbitrary `ONLY` selections are forbidden in the aggregate runner. The streaming manifest explicitly selects the two portable roadmap cases and requires both; it does not claim the full research fixture campaign ran.
- Reports retain commit, fixture and package hashes, browser version, per-suite logs, failed screenshots, resource counts and sequence traces where applicable.
- Cancellation tests keep the real Player queue and public publication. Controlled backend tests establish orchestration behavior; browser tests separately establish media behavior.
- Video readback tests detect blank/frozen output and compare known transformations. They do not establish audio fidelity, HDR fidelity or specialist codec/profile qualification.

## Release boundary

Adding jobs is not evidence that they passed. A release assessment needs green required checks on the exact candidate commit and review of any capability-specific results. Configure repository branch protection to require the contract and API browser jobs; workflow files alone cannot enforce merge policy.

Hardware output picking, OS media controls, physical screen readers, mobile Safari/WebKit, permission prompts and specialist media fidelity still need their own supported-platform qualification. Capability rejection is a contract result, not evidence that the unavailable feature works. The existing format, subtitle, audio and long-running qualification campaigns remain necessary for claims beyond these synthetic API scenarios.

Each escaped user bug should gain a minimal regression that fails on the pre-fix implementation and at least one surrounding action sequence. Preserve the rejected evidence and the reason for rejection; do not silently weaken an assertion to make CI green.
