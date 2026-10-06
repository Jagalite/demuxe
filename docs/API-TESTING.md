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
| Functional-core foundation and runtime adapters | Scoped retirement, admission bounds, effect completion, worker handshakes, resource cleanup and static boundary checks | Selected live lifecycle/cancellation cases; complete browser/backend fault coverage remains open |
| Functional-core projection | Status/event/capability/metadata expectations, immutable observations, source admission and reentrant publication tests | Selected public-state and output assertions; not all projection/failure combinations in every browser |

`Public API contracts` runs on pushes and pull requests. It checks the functional-core source boundary, builds TypeScript in CI, checks the core package declaration boundary, executes the contract manifest and consumer typechecks, and independently runs the advanced-control contracts in Chromium and Firefox without building engines.

The foundation and adapter suites are integrated into the maintained unit gate. The recorded 3,405-test run is retained in `results/api-stability/gate-unit-all-node-1791232047213/result.json`; it predates the subsequent live-suite and coverage-map additions. Virtual schedulers, deferred effects and real adapter fixtures cover admission, completion, cancellation and resource ownership. Their passing results do not qualify physical browser output or every public API combination.

Projection tests include independent expected values and compatibility comparisons. A matching old/new result is evidence for that fixture, not proof that the old behavior is correct. Current per-family limits and source references are recorded in the member-level audit below; historical migration-stage notes must not be treated as current coverage status.

An isolated negative-control step removes the advanced lifecycle guards from the generated test runtime, requires the four corresponding regressions to fail, and restores the bytes in a `finally` block. Timeouts, page errors, unrelated failures and unexpected passes do not count as successful detection. These intentionally failing reports are stored separately from qualification results.

`Provider bundle loader` reuses the fresh source-provider inventory for six API browser shards in Chromium and Firefox. All served package bytes are checked against the bundle manifest before execution. These jobs exercise the assets delivery; the existing bundle jobs exercise both assets and embedded delivery. Source candidate provider admission remains recorded as such and does not become release qualification merely because a test passes.

The weekly provider workflow increases lifecycle repetitions and browser sequence length, with a recorded seed derived from the workflow run number. PRs use a fixed seed. Deterministic contract histories cover 16 fixed seeds, each with 120 actions. Each round shuffles every action, so coverage does not depend on random selection luck. Failure messages preserve the seed and executed action prefix for reproduction.

The expected-state model updates its expectations from accepted commands, independently of player readback. It checks settings, intent, settled status, source lifetime and rollback after every action. Contract histories include rejected buffering changes and retired bindings. Browser histories run two seeds in each of Automatic, Native, Hybrid and Software: 39 actions per history normally, 130 weekly, plus recorded seeks to avoid EOF. Actions include previews, replacement, close/reopen, borrowed bindings, invalid commands and overlapping play/pause bursts and competing latest-wins seeks.

Every browser step checks source identity, forced-mode route stability and an explicit allowance for automatic fallback/promotion on the synthetic fixture. General histories permit unavailable/suspended previews; dedicated positive-preview scenarios must still require images. Playing must advance both the playback clock and video pixels; paused playback must keep both stable. The history samples the public media surface directly, avoiding queued snapshot commands that alter scheduling. This passive readback needs validation for each renderer. Reports contain the seed, action prefix, expected state, observed state and output measurements. These checks target healthy moving video away from EOF, not audio fidelity, arbitrary buffering or every possible sequence. New model scenarios require CI validation before being counted as passing evidence. The [compatibility ledger](FUNCTIONAL-CORE-COMPATIBILITY.md#existing-sequence-oracle-review) records the oracle corrections and remaining assumptions.

## Commands

Run these in CI or another authorized validation environment. They are not instructions to override a no-local-build/test restriction.

```sh
npm ci --ignore-scripts
node scripts/check-functional-core.mjs
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

## Member-level behavior coverage audit

The [machine-readable coverage map](api-behavior-coverage.json) inventories all seven published entrypoints: 130 export declarations, 222 runtime exports/members/constructors and 101 type/data contracts. Re-exported declarations are counted per entrypoint. The runtime items map to 23 reviewed behavior families in [`behavior-map.mjs`](../tests/api-stability/behavior-map.mjs), each with intended behavior, lifecycle states, failure cases, backend scope, relevant unit/browser implementations and explicit remaining gaps.

**These are mappings, not 222 claims of tested behavior.** All runtime items remain `mapped-partial`. Family references can cover some members more deeply than others; individual assertions still need refinement. Type/data contracts remain `structural-only`: the exported shape is recorded, but each option, event payload, union variant and return-value invariant has not been semantically audited. Inherited platform APIs and nested value semantics are not exhaustively inventoried. No API is marked fully covered.

Unit references mean maintained test implementations exist; they do not establish a fresh execution result. Browser implementation references likewise do not imply every browser/backend passed. Recent live assertions are attached only to `LocalVideoPreviewProvider.getFrame`, `Player.destroy`, `Player.isDestroyed`, `Player.subscribe`, `inspectMedia`, `Player.openRemote` and `Player.open`, for the exact scenarios and browser receipts listed in the map. Incidental calls to open/play/seek/pause do not qualify those APIs' full behavior. The live scenario count therefore cannot be interpreted as complete public API coverage. The later network campaign adds bounded Native file-source and inspection assertions; it does not qualify every remote backend or cross-origin credential policy. Hash matching covers the recorded fixture/harness/sampled assets, not the entire runtime package.

The highest-priority next campaigns are:

| Priority | API/behavior | Missing adversarial sequence | Required evidence |
| --- | --- | --- | --- |
| 1 | `openRemote`, custom source reads, request refresh | Delay/fail a range or authorization response; replace/destroy before it settles; deliver it late | Public source identity, rejected stale operations, request retirement, no old-source publication, then successful new-source output |
| 1 | `setQuality`, audio selection, `seekToLive` | Overlap quality/audio changes and moving live edge with segment/authentication failure and rollback | Accepted policy versus actual selected stream, preserved audio intent, observable output, failed rollback reported |
| 1 | Preview facade/controller/software provider | Replace providers/source, cancel at decoder output, fail worker, retry after capacity release | No stale image/cache entry, every caller settles, actual temporary resources retire, successor succeeds |
| 2 | Attach/remove subtitle/font/text tracks | Fetch/initialize late, remove or replace source, then deliver completion | Current-source attachment identity, correct rendered subtitle or explicit error, no old attachment resurrection |
| 2 | Fullscreen/PiP/audio output device | Reject permission, remove device or exit while replacing/destroying player | Browser/OS state, ownership release and current intent; unsupported cases explicitly capability-gated |
| 2 | Constructors/options/events and UI integration | Pairwise incompatible options, partial construction, rebind/remount, getter/listener reentry | Individual option/event contracts and independent ownership assertions across applicable browsers |
| 3 | Longer composed runs | Combine route changes, playback boundaries, snapshots, attachments and preview pressure | Bounded resources, output progression, reproducible commands and first invariant violation; separate from performance claims |

Use the report's per-family gaps to refine these into exact test cases. `Untested/unreviewed` is not the same as `unsupported`: platform or backend rejection requires a documented capability rule and a rejection test. This audit does not classify missing evidence as unsupported behavior.

Regenerate or verify the report after reviewing API/evidence changes:

```sh
node scripts/report-api-coverage.mjs --write
node scripts/report-api-coverage.mjs --check
node --test tests/api-stability/contracts.mjs
```

The maintained contract gate now requires a mapping for every declared runtime item and checks that the checked-in inventory matches current sources. New members cannot silently inherit a group's coverage. The report builder validates test references and gate membership. Optional local live receipts are recorded as missing when unavailable, and as historical when their recorded input hashes differ; missing artifacts do not become passing results. Receipts with incomplete metadata, missing required input hashes, inconsistent served runtime hashes, or unsuccessful checks are invalid and cannot claim matching inputs. Failure diagnostics have bounded trace and screenshot deadlines so a stalled page cannot prevent context cleanup. Network recovery checks require the full requested byte count as well as matching contents. `--check` compares the complete local evidence view, so a clean checkout without those optional receipts may require regenerating its evidence status. The contract gate compares stable API mappings rather than requiring local result artifacts.

### Network cancellation and authorization campaign

The live boundary runner now also uses `live-fault-server.mjs` and `live-network-scenarios.mjs`. Nine new cases exercise real HTTP: held inspection cancellation, cancelled/successful/rejected credential refresh, range-reader epoch reuse, a 503 retry, representation identity change, cancelled remote Player open followed by local replacement, and Player destruction while credential refresh is unresolved. Held-request cancellation must be observed by the server before the test releases the old response. Late credentials must not issue a new request. Successor inspections must report a video track; replacement Player sources must settle and produce a nonempty snapshot. These are specific Native-file, inspection and transport assertions, not full audible/visual playback qualification.

The fault server supplies a real HTTP document and proxies source assets. The initial intercepted-page setup was rejected by Chromium loopback-access policy; those failed setup reports are not product failures. Browser security settings remain enabled. The successful cohort uses same-origin fault endpoints and therefore does not qualify cross-origin CORS, cookie, permission or redirect behavior. HTTP bytes/ranges, ETag changes, held responses, refresh rejection and retry behavior have two maintained server contract tests.

Run the same three `BROWSER=... node tests/api-stability/live-boundaries.mjs` commands for the expanded suite. No native engine rebuild is required. Streaming-quality rollback, attachment races and broader device transitions remain open campaigns.


## Installed release boundary gate

`BETA_ARCHIVE=/absolute/path/to/candidate.tgz BROWSER=chromium npm run test:stability:release` independently installs the archive offline, verifies its complete manifest, and runs the 19 boundary cases. Repeat for `firefox` and `webkit`. The release-extra campaign runs all three automatically; the final release verifier requires their complete receipts and checks the archive, source, harness, fixture and served runtime identities. The tagged release workflow retains these receipts. Source-runtime receipts in the member inventory remain separate historical evidence.

`BETA_ARCHIVE=/absolute/path/to/candidate.tgz node tests/api-stability/archive-matrix.mjs` runs all six maintained API shards in Chromium and Firefox against independent installations of that archive. It records fixture recipes and hashes, then restores the prior fixture bytes. The tagged workflow requires this matrix before retaining publishable release artifacts.
