<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualified media components: implementation plan and review

Status: the broad-provider foundation and requested fine/common audio, TS container, separate JSPI/Asyncify, and measured component-selection extensions are implemented locally on `modular-media-providers`. See [completion and evidence](MEDIA-COMPONENT-COMPLETION.md). The staged sections below retain the reviewed migration rationale. Packet recipes remain explicit internal executions; the public Player API, legacy routing and ordered production plans are preserved. No publication is required or performed.

## Decision and scope

Introduce explicit internal execution recipes behind the existing finite playback plans. Use the existing FFmpeg and mpv implementations as the only Wasm providers initially. Preserve browser Direct/MSE and Shaka execution. Preserve currently admitted specialist mpv services as existing execution configurations; do not add or require any new specialist binaries.

One provider can fulfill multiple logical roles. The current FFmpeg preparation engine can inspect, demux, preserve video packets, adapt audio, and mux within one instance. Full mpv remains an atomic execution provider for Hybrid/Software. A logical component boundary does not imply a separate Wasm module, worker, heap, or packet transfer.

The first delivery is a behavior-preserving internal refactor. Smaller FFmpeg builds, codec modules, TypeScript readers/muxers, new compositions, and routing preference changes are later work with separate evidence. No public Player API redesign, engine rebuild, new public component registration, or new playback mode is part of this plan.

## Model and ownership

```text
Existing source inspection + selected tracks + user policy + environment
    -> existing ordered plan admission
    -> explicit recipe for the current candidate
    -> existing provider configuration and lazy loaders
    -> existing Backend/session
    -> existing runtime output verification
```

This describes responsibilities, not a new eager startup sequence. Inspection and optional asset discovery must remain at their current points in discovery, including re-admission after new facts arrive.

- **Plan:** stable policy/qualification identity, permitted transforms, source/feature restrictions, and ordering. `PLAYBACK_PLANS` and `planAdmission()` remain authoritative.
- **Recipe:** logical capability requirements and fixed connections for one admitted plan, with explicitly qualified implementation bindings. Records execution owner, service composition and synchronization profile. Capability requirements do not name asset files. It does not discover arbitrary media graphs or rank playback plans.
- **Provider:** browser-native, JS/TS, Wasm, or mixed implementation exposing one or more capabilities under a concrete interface/profile. A physical package may supply one or many providers/capabilities; a browser-native provider need not have a downloadable engine asset. Claims describe construction support, not proof that a composition plays correctly.
- **Backend/session:** retains actual open/play/seek/selection/cleanup responsibilities. `UnifiedPlayer` remains the transactional owner; recipe metadata must not become a second session controller.

Use a closed typed registry, not a plugin framework. Initially each existing plan/configuration resolves to exactly its current implementation. Runtime resolution remains deterministic, with no retry among alternative implementations.

## Initial implementation bindings

| Current plan family | Existing execution binding | Ownership retained |
| --- | --- | --- |
| `native-direct*` | `NativePlayer` browser Direct, with only currently admitted gain/subtitle services | Browser media A/V; existing subtitle service follows the established timeline |
| `native-remux*` | Current FFmpeg preparation and `RemuxPlayer`, hosted by `NativePlayer` | Existing source reads, packet construction, MSE scheduling and browser presentation |
| `native-flac*`, `native-opus*`, `native-transcode*` | Existing adaptation build/profile and MSE, plus admitted services | Existing precision, channel/rate and lossy-permission rules |
| `native-video-mpv-audio*` | Existing video preparation and mpv-audio configuration, optionally mpv subtitles | Preserve each runtime's existing synchronization and PCM transport |
| `shaka-mse*` | Existing `ShakaBackend` and admitted gain | Shaka adaptive scheduling/selection and browser presentation |
| `hybrid*` | Existing `WasmPlayer` Hybrid configuration, atomic to the router | mpv timing/audio/subtitles and the existing browser video decoder bridge |
| `software*` | Existing `WasmPlayer` Software configuration, atomic to the router | mpv/FFmpeg decoding and current retained presentation |

These are documentation groups. The implementation must enumerate every actual plan ID, including gain and subtitle variants; it must not infer new valid combinations from the table.

Illustrative recipes using current providers:

1. An already-admitted `native-transcode` candidate for suitable HEVC/AC-3 MKV: existing FFmpeg adaptation instance performs container reading, HEVC packet preservation, AC-3 decoding, FLAC24 conversion/encoding and fMP4 muxing; current MSE/browser playback presents A/V. The recipe records those roles without exposing intermediate packets or PCM to JavaScript. Admission still depends on actual source, selected tracks, browser, assets and runtime.
2. An admitted full-mpv candidate: existing Hybrid or Software configuration opens the original source through its established transport. Hybrid-to-Software fallback remains governed by current failure classification and policy. Software still requires its current deployment conditions; the registry does not make it universally available.

## Minimal metadata

Start with only fields consumed by construction, validation, or diagnostics:

| Declaration | Initial content |
| --- | --- |
| Identity | Stable internal recipe/provider ID and configuration revision; existing plan ID remains the user-facing route identity |
| Supplied roles | Browser presentation, integrated FFmpeg preparation/adaptation, atomic mpv execution, or existing mpv services |
| Capability restrictions | References to current source/codec/feature predicates and named build profiles; do not duplicate admission rules in a new codec table |
| Runtime requirements | Actual selected pthread/JSPI/Asyncify implementation, isolation/shared-memory requirements, MSE/WebCodecs/Web Audio dependencies where applicable |
| Assets/dependencies | References to existing loaders and manifest-owned modules, Wasm, worker/worklet entries and fonts, resolved against `assetBase` |
| Ownership/lifecycle | Existing clock/synchronization profile, resource policy and backend/service owner; acquisition and release responsibilities |
| Qualification | Existing plan admission and evidence scope; exact implementation/build association where recorded; no inferred qualification for replacement builds |

Keep binding data internal rather than changing the exported `PLAYBACK_PLANS` shape during the first extraction. Use type-only imports where appropriate; importing the registry must not fetch assets, compile Wasm, or initialize services.

JSPI/Asyncify are implementation attributes, not new plan IDs. Continue calling the current `selectRemuxRuntime()` policy and pass its result to the existing loaders. Preserve constructor-time argument checks and explicit runtime errors. In modular auto/on mode, filter implementation choices by qualified deployment before loading; explicit JSPI/Asyncify choices remain pinned. Atomic mpv has independent runtime admission. No failed-asset retry is introduced.

Do not define a universal packet/PCM ABI yet. When a real second implementation requires one, specify timestamp/configuration, buffer ownership, priming/trim, flush/seek generations, backpressure and cancellation together with that implementation.

## Technology- and packaging-independent capabilities

Design requirement: logical capability resolution is independent of both implementation technology and physical packaging. Keep four dimensions separate: the semantic capability requested, the implementation providing it, how that implementation is delivered, and its current availability/readiness/cost evidence. A provider may use browser-native APIs, JS compiled from TypeScript, Wasm, or a qualified combination. Delivery may be browser-provided, included in the application bundle, an optional JS chunk, a fine asset (`ac3.wasm`, `dts.wasm`, `flac.wasm`), or a bundle (`audio-repair-common.wasm`, `remux-common.wasm`). These alternate packaging examples are not currently available or qualified builds. Initially bind only today's existing browser, JS and broad FFmpeg/mpv execution paths.

### Capability descriptors

A descriptor identifies an operation and a versioned semantic contract, independently of technology or packaging. A recipe requests the operation plus a constrained profile; provider offers must satisfy that profile without weakening fidelity or selection policy. Neither `.wasm` nor a browser API name belongs in a logical capability ID.

| Example capability | Required profile/contract details |
| --- | --- |
| `audio.decode.ac3`, `audio.decode.dts` | Codec variants, input configuration, output sample representation/layout, supported rates/channels, timestamp and delay/trim behavior |
| `audio.encode.flac` | Input PCM profile, precision conversion policy, supported rates/layouts, output codec configuration, sample counts and drain behavior |
| `remux.mkv` | Input Matroska profile, selected codecs/tracks, output container (for example fMP4), packet/configuration transformations, seeking and timeline restrictions |

`remux.mkv` must not mean arbitrary MKV support: a profile states the output and preserved/transformed streams. It may denote an integrated preparation operation. A future standalone reader would use a distinct `container.read.mkv` contract. Do not list overlapping integrated and standalone operations as independent required work.

Descriptors reference semantic contract versions and existing constraint predicates. Concrete provider offers additionally declare implementation identity/technology, binding/interface, availability probes, runtime requirements, and which roles must be acquired together. Browser availability must be evaluated for the requested configuration; an API-presence hint is not verified output. JS/TS bundled with the app must be present in that actual build, not merely a possible dependency. A bundled FFmpeg pipeline may expose several logical operations only through a single integrated binding; `provides` does not promise independently callable decoder functions. Likewise, opaque browser playback cannot satisfy a recipe requiring accessible decoded PCM just because the browser can play that codec.

### Bundle manifests

Use a common internal provider catalog with optional delivery manifests. Extend the existing deployment manifest model for packaged assets rather than inventing a second asset installer. Browser-provided implementations have no engine download; application-bundled JS points to the application build/chunk identity. Each fine or bundled package uses the same delivery schema:

```text
packageId / packageRevision
delivery: browser | application-bundle | optional-assets
assets: [{path, hash, bytes, kind}]       # Wasm, loader, worker, worklet, etc.
dependencies: [exact package identities]
provides: [{capability, contractVersion, profile, implementationId, technology, binding}]
bindings: [{id, interfaceVersion, acquisitionGroup, availabilityProbe, runtimeRequirements, resourceLimits}]
build: {sourceRevision, sourceHashes, toolchain, configurationHash}
qualificationRefs: [evidence record identities]
distribution: {npmPackage, packageVersion, coreCompatibility, providerContractVersion}
licensing: {packageLicense, fileLicenseMap, notices, sourceBuildRecord}
```

Asset lists can be empty for browser-provided execution, while any Demuxe adapter remains part of its actual application or asset build. Use browser/environment identity for native implementation evidence instead of inventing a browser engine hash. Runtime readiness and measured cost are mutable evidence kept outside the immutable manifest.

For example, `ac3` provides `audio.decode.ac3`; `audio-repair-common` provides AC-3 and DTS decode plus FLAC encode. Both point to the same AC-3 implementation source identity for an equivalent profile. `remux-common` lists only the container/output profiles actually built and tested. Actual manifests must contain concrete identities and hashes; these names alone establish nothing.

Capabilities and dependencies must be satisfiable by the available native APIs, actual application bundle and deployed asset set, including loader/worker dependencies, not merely a present `.wasm` file. Qualification references are checked against Demuxe's maintained allowlist and artifact/environment bindings; a provider cannot grant itself automatic admission. Validate dependency cycles and interface conflicts as manifest errors. Keep existing integrity and `assetBase` resolution guarantees.

### Selection and lazy loading

Future provider selection operates *within* an admitted recipe and only among its enumerated qualified binding sets. For example, a recipe may list either `{remux-common, ac3, flac}` or `{remux-common, audio-repair-common}` with explicitly compatible interfaces. Covering the requested capability names does not authorize a third combination.

1. Filter binding sets by exact source/profile, user policy, composition qualification and compatible interfaces. Check browser-native configuration availability, application-bundled implementation presence, deployed dependency closure and provider-specific runtime requirements. Current JSPI/Asyncify/pthread policy applies only to implementations that require it; do not impose Wasm gates on JS or browser providers. Preserve current staged inspection/availability checks and current policy validation. Unknown availability remains unknown until checked through the existing mechanism.
2. Snapshot readiness separately: native configuration supported/unknown/rejected; JS included versus imported/evaluated; verified bytes resident versus only known cached; Wasm compiled versus instantiated; and an instance prepared versus active/busy/reusable. These are distinct facts, not one `loaded` flag. Account for any initialization, worker, audio-context or instance-reset work still required. Keep stateful instances session-owned unless their existing lifecycle explicitly permits reuse.
3. Rank eligible binding sets using a deterministic, versioned cost policy over measured startup and execution costs, adjusted for that readiness snapshot. Include remaining transfer/parse/compile/instantiation/init work, steady CPU, throughput/deadline performance, peak memory, and copies/bridges in the complete composition. Count shared assets/acquisition groups once. Native or already-loaded providers receive no unconditional priority: saved startup can be outweighed by measured execution cost or memory pressure.
4. Use application-known cache evidence only. Do not assume a URL is in the browser HTTP cache or fetch every alternative to find out. Cached bytes do not imply evaluated JS, compiled Wasm or a reusable instance. Cache state influences remaining work, never qualification or integrity.
5. Freeze the chosen binding for the candidate/session. Load only its dependency closure at the established activation points; release through existing owners. A later cache or cost update must not trigger an active-session provider switch.

This is bounded selection among approved implementations, not a graph planner or general set-cover solver. A bundled JS reader might already be evaluated, a browser decoder might support the exact output contract, or a compiled Wasm bundle might avoid startup work. None is inherently fastest. Record eligible alternatives, rejection reasons, readiness snapshot, cost-evidence identity and the chosen binding internally.

### Measured cost evidence

Cost records identify provider/binding/build, recipe, browser/device/runtime, source workload class (codec/profile, resolution/rate/channels and relevant source conditions), measurement method/date, sample count and variability. Distinguish directly measured values from estimates of remaining work. Preserve unknown values; missing CPU or instantiation data is not zero. Avoid labeling browser-native execution as hardware accelerated or inexpensive without evidence.

Use comparable qualified recipe measurements to rank complete binding sets. Component microbenchmarks can inform hypotheses but do not establish whole-recipe cost: copying, scheduling, GC, bridges and shared instances can dominate. Do not sum isolated component timings and present that as measured end-to-end behavior. Resource/deadline limits remain hard constraints before ranking.

Keep startup time, steady CPU, memory and throughput as separate metrics. Define a bounded internal policy for comparing them, including a documented workload horizon when amortizing startup; do not collapse unlike units into an unexplained score or treat total file duration as known viewing time. With missing, stale, incomparable or indistinguishable measurements, use the stable qualified baseline preference. Preserve uncertainty in diagnostics. Gather evidence through controlled experiments or bounded instrumentation of the selected execution, not speculative execution of all candidates during playback.

The initial migration used shadow evaluation. The implemented component executor now selects among explicitly qualified bindings using complete-recipe measurements and exact readiness context. This does not change ordered production Player plans or infer missing cost values.

Keep broad FFmpeg as an explicit qualified binding where it already implements the recipe. If no lightweight binding is eligible, it can remain the broad option without changing media semantics. Once execution starts, do not reinterpret asset, authorization or identity failures as permission to try another provider. Compatibility failures follow the existing route policy, eventually reaching full mpv only when currently admitted. Existing optional-inspection and timeout-restoration exceptions remain exact. Cache preferences cannot reorder playback plans or bypass terminal failures.

### Shared implementation and qualification

Generate fine and bundled variants of the same implementation from a common source tree, codec adapters, semantic profiles and parameterized build definitions. Packaging selects which implementations are linked; it must not introduce a second decoder algorithm or divergent timestamp/PCM conversion code. Apply the same principle to JS/TS application-bundled versus lazy-chunk delivery. Native APIs and independent JS/Wasm algorithms cannot be assumed to share source: they share the semantic contract and conformance suite, with separate implementation qualification. Preserve provenance, licenses and configuration hashes for each artifact. Different compiler flags, link options, runtimes or memory layouts remain observable build differences even with identical source revisions.

Share conformance fixtures, expected outputs, tolerance definitions and lifecycle tests by implementation/semantic contract. Run that common suite against both packaging variants, including decode/encode output, timestamp/priming/flush behavior and isolation between simultaneous capabilities in a bundle. Link both results to the same semantic evidence family, while binding each result to its actual artifact.

Do not grant blanket qualification inheritance from shared source. Each physical variant needs loading/ABI/runtime, memory/resource and teardown checks; each allowed complete binding set needs recipe-level A/V, seek, selection and fallback evidence. Performance evidence is packaging-specific. Runtime acceptance and negative caches must include the concrete binding/build/configuration so success or failure does not leak across variants.

Planning impact: steps 0–1 should represent capability requirements separately from technology/delivery bindings and record only existing browser, JS and broad FFmpeg/mpv execution paths. Cost-based choice, fine/bundled builds, new packet interfaces and additional automatic bindings remain later experimental work. No public Player API or production routing changes are included in this addition.

## Distribution and missing-provider behavior

### One monorepo, independently published packages

Keep core, provider adapters, engine sources/build recipes and qualification fixtures in this monorepo. Introduce independently packable workspace packages in a later distribution slice; physical source moves are not required for the initial recipe refactor. Shared source/build tooling can remain repository-local, with each publish target having an explicit file allowlist and dependency closure.

| Publish target | Intended responsibility | License metadata |
| --- | --- | --- |
| `demuxe` | Apache core: Player/control plane, contracts, policy, generic provider loading, browser execution and admitted core-owned code | `Apache-2.0` for Demuxe core; audited per-file notices for any expressly approved third-party material |
| `@demuxe/provider-ffmpeg` | FFmpeg-specific adapters, engine assets, build profiles and their runtime dependencies | Exact SPDX expression and per-file/component map derived from the built FFmpeg closure, including applicable LGPL components |
| `@demuxe/provider-mpv` | mpv/FFmpeg execution, provider-specific adapters, services and runtime dependencies | Exact license expression and component map from its actual mpv/FFmpeg build; do not infer it from the package name |
| Future TS/Wasm/third-party providers | Additional implementations and fine/bundled delivery variants | Independent artifact-specific license metadata, notices and provenance |

Core must not depend on, bundle, re-export implementation code from, or auto-install optional FFmpeg/mpv providers. Providers target a versioned internal provider contract and declare compatible core versions; their npm versions can advance independently. Keep shared interfaces Apache-owned and free of provider implementation dependencies. Engine assets, native glue and provider-specific loaders stay with their owning provider even if some individual files have permissive licenses. Inventory existing generic versus provider-specific JS before extracting packages; Shaka and any other third-party assets also need explicit package ownership rather than accidental inclusion.

Distribution selection is a build/deployment concern, separate from the public Player API. Installed npm packages are not browser deployment facts: a build must explicitly include/configure provider descriptors and deploy their complete asset closures. A generated deployment catalog records configured package versions, provider/contract identities, asset roots and hashes. Preserve `assetBase` for the existing layout; future package-root mappings belong to deployment metadata, not a new Player option in this task. No runtime npm discovery, silent CDN download or registry installation.

### Explicit availability and rejection semantics

Track provider availability separately from loaded/cache state: absent from deployment, configured but unverified, ready for acquisition, or failed validation/acquisition. Record the reason and deployment-catalog revision. Browser-native and application-bundled JS providers use the same availability model with their appropriate configuration/build evidence; they need no npm engine package.

For each semantically admitted candidate, resolve only its qualified binding sets against the configured deployment and current environment:

1. If no installed/configured qualified provider set can fulfill a required capability/profile, reject that candidate with `DEPLOYMENT_UNAVAILABLE`. Include the missing capability/profile and the acceptable qualified provider or complete binding requirement. An installed but unqualified or incompatible provider does not satisfy it. Distinguish those reasons from simple absence.
2. If no composition has ever been qualified for the requested semantics, retain `QUALIFICATION_REQUIRED` or the existing source/feature rejection instead. Do not suggest that installing a package will enable an unqualified composition. A genuine media rejection remains a media rejection.
3. Continue in the existing admitted plan order, honoring explicit mode pins and user policy. Before starting any next candidate, establish that its own provider set is available. Broad FFmpeg and full mpv are options only when actually configured, deployed, compatible and qualified; neither is an implicit resident fallback.
4. If deployment gaps exhaust otherwise admitted recipes, return a typed deployment failure plus bounded per-candidate diagnostics. Do not turn it into `UNSUPPORTED_MEDIA`. Preserve all other rejection reasons for explanation; a terminal source/authorization/integrity/runtime error retains its existing precedence and stops fallback.

Configured-but-unverified is not equivalent to absent. Validate through bounded existing discovery/acquisition mechanisms, retaining lazy downloads. A package omitted from the deployment catalog is a known deployment gap; a declared required asset that fails to load, has an invalid hash, or cannot initialize remains an asset/integrity/runtime failure under current classification. Do not relabel a 404, network failure or corrupt configured package as optional absence to enable silent fallback. Existing optional-inspection and bounded timeout/restoration exceptions remain unchanged.

Example internal diagnostic:

```text
code: DEPLOYMENT_UNAVAILABLE
planId: native-transcode
recipeId: <qualified recipe identity>
missing: [{capability: audio.decode.ac3, profile: <required semantic profile>,
           acceptableBindings: [<qualified binding identities>],
           providerPackages: [@demuxe/provider-ffmpeg], reason: not-configured}]
deploymentRevision: <catalog identity>
```

Provider package names are actionable context, not proof that every build of that package supplies the capability. List binding groups when several providers must be installed together; do not imply that an individual package completes the recipe. Bound and redact diagnostics, excluding credentials, signed URLs and local paths. Cache deployment rejections by deployment revision and selection/configuration, separately from source compatibility evidence; do not poison `TierAttempts` with missing-provider failures.

Current-code gap: `PlaybackDecisionCode`/`PlanRejectionCode` already include `DEPLOYMENT_UNAVAILABLE`, but `PlayerErrorCode` does not. `discover()` currently ends with a generic no-route error that `playerError()` can classify as `UNSUPPORTED_MEDIA`. The later distribution implementation must introduce a typed final deployment outcome and preserve its structured reasons through existing diagnostic/error plumbing. An additive public error-code declaration may be necessary and must receive consumer compatibility tests; do not implement a string-message workaround. This planning edit changes neither the public API nor current production behavior.

### Machine-checkable package boundaries

Extend the existing `scripts/license_policy.py`, `scripts/check-licenses.py` and `scripts/check-core-boundary.mjs` checks with independent publish-target policies. Keep distribution ownership separate from license permission: a provider-owned file must not enter core merely because its own header says Apache or MIT.

- Maintain a machine-readable ownership/license map for every source, generated output, vendored dependency and shipped binary. Record target package, SPDX expression, provenance and required notices/source/build records. Unknown ownership/license fails packaging; generated outputs inherit audited input closure, not a newly stamped license claim.
- Build each target into a fresh staging directory using positive file allowlists. Reject paths/symlinks escaping the declared inputs, workspace imports into provider implementation from core, hidden optional-install scripts, provider dependencies in the core install closure, and cross-package source-map content. No broad root `files` glob or copied runtime directory may pull engines into core.
- Inspect bundler input metadata and dependency graphs as well as filenames: provider code can be inlined into JS, source maps or embedded binary data. Compare generated file hashes to build/provenance records and fail on undeclared inputs or changed artifacts. Wasm presence alone is not the rule; package ownership and actual license closure are.
- Pack each package, then audit the exact npm tarball contents, `package.json` dependencies/exports/license, file license map, notices and artifact hashes. Assert that core contains no LGPL or provider-owned implementation/assets. Provider tarballs must retain their own verified notices and source/relink/build companion bindings under the existing release policy. Core metadata cannot substitute for provider metadata.
- Install the audited tarballs into clean external consumers, rather than resolving through workspace symlinks. Verify core-only installation has no provider package/assets or implicit downloads; test each supported core/provider version pairing and reject ABI mismatches. Publish only the exact audited tarball identities.

These gates enforce the repository's distribution policy and retained licensing evidence; a package-level `license` string alone is insufficient. The package split does not relabel engine code or erase existing release obligations. Do not copy provider documentation/source archives into core as an accidental consequence of monorepo packaging.

### Distribution delivery and acceptance gates

Keep steps 0–4 below as the existing-layout behavior-preserving migration. After that baseline, add a separate distribution slice: inventory ownership; define package manifests/compatibility and deployment catalogs; implement typed deployment rejection; build/audit separate tarballs; qualify core-only and selected-provider deployments. Full existing provider deployment must retain the same route order and behavior. Reduced deployments intentionally have fewer available candidates, with deployment-specific diagnostics.

Required regression cases:

- Core/browser-only playback works without requesting FFmpeg/mpv assets. An admitted recipe with no provider rejects as `DEPLOYMENT_UNAVAILABLE`, never as unsupported media.
- FFmpeg absent with a qualified mpv plan available skips only unavailable candidates and retains admitted order. mpv absent does not start a fictitious Software fallback. Neither available yields an aggregate missing-requirement diagnostic when such recipes were otherwise admitted.
- Installed-but-not-configured, omitted dependency closure, incompatible provider ABI, and installed-but-unqualified offers produce precise preflight reasons. Unknown configuration is not silently treated as present or absent.
- Declared asset download/integrity/initialization failure remains terminal where it is today; no fallback regression is hidden by deployment classification. Explicit mode/source/transport constraints remain binding.
- Updating the deployment catalog invalidates missing-provider evidence without widening qualification or reusing another provider's runtime evidence.
- Negative package tests deliberately insert an LGPL source/Wasm, a permissively licensed provider-owned loader, bundled provider code, a leaking source map, and an undeclared generated asset into core staging. Every case must fail the tarball/boundary gate; separately verify provider notice/provenance omissions fail.

## Delivery sequence and gates

### 0. Capture the behavior baseline

Inventory every plan ID and current constructor parameters, selected runtime, inspection timing, optional-asset checks, owners, and fallback edges. Record source revision plus working-tree diff and relevant asset identities. Do not use `HEAD` alone as the baseline in this dirty checkout.

Extend existing tests only where required to observe externally meaningful behavior: ordered eligibility/rejection, selected route and runtime, asset requests, startup output, track preservation, and failure classification. Keep new fixtures bounded and focused.

Gate: all current plan variants have a recorded mapping; pre-existing failures and missing fixtures/assets are distinguished from refactor regressions.

### 1. Add recipe descriptions without changing execution

Proposed new internal modules: `src/internal/execution-recipes.ts` for logical requirements and typed explicit bindings and, only if needed, `src/internal/media-providers.ts` for shared provider descriptions. Keep capability identity independent of technology and asset names; register only current browser, JS and broad FFmpeg/mpv paths. Reference current plans and loaders without introducing another policy engine. Model alternatives already selected by existing runtime/presenter policy as concrete configurations.

Gate: exhaustive coverage of plan IDs, no unknown bindings, no registry import side effects, unchanged admission results. Descriptions alone do not establish qualification.

### 2. Route backend construction through the binding

Use the binding at `UnifiedPlayer.create()` to select the same native/Shaka/Wasm constructor and arguments. Keep source inspection, candidate ordering, readiness, event wiring, surface ownership, transactional replacement, and fallback in their current owners. Replace plan-name checks in construction incrementally; do not rewrite `planAdmission()` in this slice.

Gate: compare accepted plan, backend configuration, output verification, failed replacement, cancellation during import/startup, and cleanup against step 0. No additional candidate engines are started.

### 3. Make existing service composition and loading explicit

Pass resolved preparation/subtitle/audio profiles into `NativePlayer` through an internal configuration, preserving current loader and service lifecycles. Reuse current asset/preparation machinery. A selected recipe supplies its dependency set, but retain current staged asset checks and conditional activation; declaring a dependency must not eagerly load it.

Do not change package contents, asset paths, integrity/ABI checks, CDN behavior, or public `prepare()` semantics. An integrated engine is acquired once even when it supplies several roles. Keep existing sharing scopes; no new global engine cache or reference-counting framework.

Gate: ordinary Direct and remux paths request no extra optional engines; current inspection and explicit preparation remain permitted. Fallback assets load only at the existing attempt/preparation points. Abort, close, replacement and destroy leave no extra workers, readers, worklets or audio contexts.

### 4. Consolidate implementation metadata and verify parity

Replace remaining implementation-related string checks where the recipe is authoritative. Leave semantic admission predicates and qualification restrictions intact. Keep published plan IDs, diagnostics, selection events and playback explanation behavior stable. Use internal trace/test records for recipe identity, concrete runtime and failure stage initially; any public diagnostic additions require separate compatibility review.

Retain `RuntimeCapabilities`, `TierAttempts`, watchdogs and fallback classifications. Preserve compatibility versus terminal failures, inconclusive evidence handling, the optional-inspection Direct exception, and bounded Direct/remux timeout restoration. No new generic fallback rule.

Gate: relevant regression matrix passes against the same baseline assets. Regenerate checked-in outputs only from source and review the resulting scope. No performance or expanded qualification claim follows from parity.

### 5. Stop at the extension point

The first delivery is complete when existing plans execute through explicit recipes with the same providers and observable behavior. There is no requirement to install a second provider to complete it.

Future work may register one replacement preparation implementation or one packet/codec composition experimentally. Before multiple implementations can serve one plan, qualification, runtime evidence and negative caches must distinguish recipe/configuration/build identity as well as source/selection. Do not allow one recipe's success or failure to qualify or poison another. Automatic ordering and fallback between such alternatives require a separate routing change.

## Validation matrix for implementation

- Policy: existing `tests/plan-admission.mjs`, `tests/tier-policy.mjs`, runtime selection contracts; verify both eligibility and meaningful rejection reasons, explicit modes, filters, gain, lossless/lossy policy and selected tracks.
- Browser execution: Direct, remux, adaptation, specialist services, Shaka, Hybrid and Software through applicable existing suites such as `tests/automatic-selection.mjs`, `tests/audio-adaptation-lifecycle.mjs`, `tests/private-adaptation-ass.mjs`, and `tests/private-mpv-lifecycle.mjs`.
- Runtime/loading: isolated pthread and applicable isolated/non-isolated JSPI/Asyncify paths, unsupported JSPI, missing required assets, optional inspection failure and no-range responses. Reuse `tests/runtime-selection-regressions.mjs`, `tests/mpv-runtime-isolation.mjs` and asset-copy checks where touched.
- Lifecycle: actual selected audio/video/subtitle output; paused and playing seeks; track changes, pause/rate, EOF, failed/cancelled replacement, recovery, repeated close/destroy. Advancing time or successful MSE append is insufficient output evidence.
- Transport/API: source identity and permission failures, authorized remote reads, explicit streaming constraints, existing public API/state and consumer checks.

Run the build and relevant maintained suites for each implementation slice; broaden to the affected browser/runtime matrix before completion. Record exact invocations, fixture/build identities and missing coverage. Do not create tests that merely restate recipe fields. No tests or engine builds are required to publish this planning document.

## Review findings incorporated

| Risk found during review | Resolution in this plan |
| --- | --- |
| Treating every role as a separate module would invent unavailable providers and add copies/heaps | Existing FFmpeg fulfills multiple roles in one engine; mpv remains atomic; packet ABI deferred |
| A registry could become a second routing policy and drift from admission | Closed explicit bindings; existing admission, ordering and failure classification remain authoritative |
| Recipe-wide preloading could change startup, missing-asset behavior and Direct fallback | Preserve staged inspection/asset discovery and current lazy activation; verify requested assets |
| A universal clock contract could break existing split-audio synchronization | Bind exact existing synchronization profiles; no clock or scheduler extraction |
| Alternate runtimes could accidentally inherit codec qualification or silently retry | Preserve current runtime policy and service envelopes; no new runtime fallback |
| Plan-only evidence would become unsafe with multiple implementations | Keep one current implementation per resolved configuration now; require recipe-specific evidence before adding alternatives |
| Refactoring plan metadata could change public diagnostics/events | Keep external shape and IDs stable; use internal binding/trace data first |
| Shared checkout changes could obscure parity | Freeze actual source/diff/assets and preserve unrelated changes; do not claim a clean-HEAD comparison |
| Capability names could accidentally imply independent entry points or permit arbitrary bundle combinations | Declare acquisition/binding constraints and enumerate qualified complete binding sets |
| Common sources or cached assets could be mistaken for qualification | Share semantic test definitions, bind evidence to actual artifacts/compositions, and use cache state only after eligibility filtering |
| Native or already-loaded providers could receive unjustified priority | Separate availability/readiness from measured startup and execution cost; compare qualified binding sets, retaining the baseline when evidence is insufficient |
| Wasm-oriented manifests could exclude browser-native or application-bundled JS execution | Keep capability, implementation technology, delivery and mutable runtime state separate; permit asset-free native offers and build-bound JS offers |
| Missing optional providers could be mislabeled as unsupported media or assumed present for fallback | Resolve explicit deployment facts per admitted candidate; preserve typed deployment exhaustion and available-provider-only fallback |
| Separate package names could conceal LGPL/provider code inside core bundles | Enforce ownership and license closure on inputs, generated outputs, dependency graphs and exact packed tarballs |

Review conclusion: the current-engine slice now implements the finite recipe model, deployment-aware acquisition and independent audited packages without a new media binary or general graph executor. Actual reduced-deployment browser tests preserve admitted plan order and verify output. The abstractions stop at existing lifecycle boundaries; new codec/module compositions still require explicit qualification. The wider cost-ranking design is not activated by this implementation.

## Source references

- [Plans and admission](../src/internal/playback-plans.ts), [selection predicates](../src/internal/selection.ts), [discovery and session ownership](../src/unified-player.ts).
- [Backend contract](../src/internal/backend.ts), [Native composition](../src/internal/native-player.ts), [runtime evidence and failures](../src/internal/runtime-capability.ts), [negative evidence](../src/internal/tier-policy.ts).
- [Runtime selection](../src/internal/remux-runtime.ts), [preparation](../src/internal/engine-preparation.ts), [runtime policy](REMUX-RUNTIME.md), [asset deployment](RUNTIME-ASSETS.md).
- [Error normalization](../src/internal/errors.ts), [public decision/error codes](../src/types.ts), [license policy](../scripts/license_policy.py), [license checks](../scripts/check-licenses.py), [core boundary checker](../scripts/check-core-boundary.mjs), [current package assembly](../scripts/package-beta.py).

Document validation: source inspection and local link/whitespace checks only. Implementation parity, browser qualification and performance remain untested by this planning task.
