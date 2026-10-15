<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe: hierarchical agent ownership and continuous improvement

**Status:** proposed operating design, not installed orchestration or permissions.  
**Repository:** `Jagalite/demuxe`.  
**Reviewed:** October 15, 2026.  
**Baseline:** `main` at `d467c6bbe693bd64f142d62d391519883250792f` (October 10, 2026).  
**Recommended ownership capacity:** 8 parent domains, 40 component scopes, 120 smaller audit scopes, plus 4 supporting roles.

**Companions:** [Index](README.md) · [machine-readable domain map](domains.json) · [task assignment template](TASK-TEMPLATE.md).

## 1. Decision

Use a **hierarchy of responsibility**, not forty independent teams authorized to change arbitrary files. The natural detailed map below has **40 component owners**. Add a coordinator, an integration/contracts reviewer and two independent verification roles for **44 logical roles**. These are ownership slots and job types, not a recommendation to keep 44 agents consuming compute or writing continuously.

A component agent should own its **policy/state-machine logic, physical implementation and targeted regression tests together**. For example, a preview-cache agent needs both `src/internal/machine/preview.ts` and `src/preview/controller.ts`. Assigning the pure policy to one team and its runtime implementation to another would create unnecessary handoffs at exactly the correctness boundary being audited. The current preview controller makes that relationship explicit. [R4, R8]

Start with **four active production-writing tasks** drawn from non-conflicting scopes, while other agents investigate, reproduce or verify. This is a conservative operating starting point, not an experimentally proven optimum. Raise the write limit only after observing merge conflicts, verification backlog, regression escapes and host contention. Forty audit domains do not imply forty independently writable integration paths.

No large directory restructure is needed to begin. Keep logical ownership stable, establish task-level write boundaries, and extract a small shared module only when repeated collisions justify it.

### What this review establishes—and does not

This plan is grounded in the pinned source trees, selected implementation bodies, package scripts, the API-stability suite registry/runner, contribution/testing policy and the open PR inventory. The inspected source includes composed session authority, resource/effect integration, preview orchestration and the lower-level BrowserPlayer. [R1–R10]

It is **not a full defect audit, a measured optimal-agent-count study, an exhaustive import graph, or an executed test campaign**. Repository builds and media qualification were not run for this document; the GitHub connector was used for inspection because a local checkout could not be obtained in this session. The companion JSON is a **navigation seed**, not a complete per-file authorization policy. All broad directory anchors must be resolved into exact task paths before granting write access.

Publishing this guide does not launch agents, change Demuxe runtime behavior, enforce file leases, publish releases or schedule recurring agent execution.

## 2. Why these boundaries fit Demuxe

### 2.1 Separate semantic ownership from physical folders

The source already separates many pure decisions in `src/internal/machine/` from adapters and side effects in `src/internal/`, `src/internal/effects/`, `src/preview/`, `src/player/`, `web/` and `native/`. The public Player composes those pieces. The map therefore follows **behavioral responsibility across those directories** rather than assigning one agent to an entire language or folder. [R2–R4, R7–R8]

A machine file may be a useful small audit target, but it cannot by itself establish that the actual worker, browser or native code obeys its decisions. Conversely, changing an effect adapter without reviewing the corresponding decision logic can preserve local tests while breaking cancellation or ownership semantics.

### 2.2 Treat integration hubs as genuinely shared

At the reviewed snapshot, `src/unified-player.ts` is 231,894 bytes; `src/internal/native-player.ts` is 89,856 bytes; `src/player/index.ts` is 76,914 bytes; and `src/internal/shaka-backend.ts` is 39,739 bytes. Size alone is not a defect. These are important integration surfaces where several proposed agents will need context. [R2–R3, R5]

The composed transition also explicitly handles cross-domain retirement, resource cleanup, effect outcomes, transport intent and publication revisions. Separate leaf invariants are necessary but insufficient to validate the composition. [R7a]

Therefore use **one temporary writer per shared file**, with designated integration ownership and broad read/review access. Different line ranges in one file do not automatically make concurrent changes safe.

### 2.3 Test responsibilities stay with the code

Demuxe already has targeted tests for source/operation state, workers, resources, routing, previews and integrations, and an explicit, reviewable suite registry. Reuse those entry points. Do not create a separate “tests team” that lets implementation owners stop thinking about regressions. H03 owns the test infrastructure; feature agents still own the regression evidence for their changes. [R9, R10, R10a]

The top-level `npm test` script is a relatively small selection, not the full API-stability or browser gate. The browser stability runner requires identified runtime assets and rejects incomplete or stale evidence in several ways. The map below names starting tests, **not sufficient merge gates by themselves**. [R9, R10, R10a]

### 2.4 Preserve architectural and evidence boundaries

Keep Native/Hybrid/Software modes, feature/output contracts, provider eligibility and runtime asset identity separate. A successful capability query must not be promoted into a claim of successful real decoding. A codec or provider optimization must not silently reduce fidelity. Treat the atomic mpv provider and Shaka-managed streaming responsibilities as boundaries to preserve unless an explicit architecture proposal changes them. [R7, R9, R13]

The existing testing standard distinguishes correctness, startup latency and steady-state performance. It calls for real output evidence, identified fixtures/builds, preservation of rejected measurements and no competing benchmarks/builds during performance qualification. More agents must not weaken that standard. [R11]

## 3. How to assign any granularity

| Level | Example | Responsibility | Write authority |
|---|---|---|---|
| L0: repository | `DEMUXE` | Architectural constraints, priorities and conflict resolution. | No implicit universal write grant. |
| L1: parent domain | `F` | All subtitles/preview work, including coordination of children. | Exact leased files only; cannot overlap a writing child. |
| L2: component | `F02` | Preview authority/controller/cache and its tests. | One bounded task at a time against an approved file set. |
| L3: audit scope | `F02.cache` | A narrower invariant such as cache admission/retention. | Read/test by default; shared implementation edits remain serialized. |
| L4: task | `F02-cache-review-001` | One reproducible investigation, fix or verification result. | Explicit base/head, objective, paths, lease and acceptance evidence. |

Ownership levels L0–L4 are separate from verification lanes V0–V4 in §9. In automation, use the explicit keys `scope_level` and `verification_lane`, not a bare number.

Assigning a parent authorizes it to **coordinate** its children, not to race them. At any moment, select a non-overlapping frontier of the hierarchy: the parent may work broadly, or children may work separately. Read-only review may overlap; active production writes may not. The coordinator must expand a parent task into actual file leases before work starts.

The 120 smaller scopes are hypotheses/invariant partitions, not 120 pre-existing independent source packages. Several subscopes intentionally share a file. They support focused audits and separate regression design today; parallel production editing requires either serialization or a previously merged extraction.

### 3.1 One task, one accountable owner

Each task declares one primary owner, affected neighboring owners, independently reviewed acceptance criteria and an explicit stopping condition. A task spanning three domains has one driver and two reviewers—not three independent implementations of the same fix.

The primary owner can read all relevant source. It may only modify approved paths. When a fix needs another domain's file, stop expanding the patch silently: request an additional lease and review, hand off the integration, or split the work into compatible steps.

### 3.2 The ownership tree

```text
DEMUXE
├── A  Session, public API and control (6)
│   ├── A01 Public API, types and exports
│   ├── A02 Composed player and source lifecycle
│   ├── A03 Transport, seeking and playback boundaries
│   ├── A04 Settings, track selection and attachments
│   ├── A05 Effect execution and resource ownership
│   └── A06 Publication, observations and diagnostics
├── B  Routing, capabilities and providers (5)
│   ├── B01 Route discovery, inspection and admission
│   ├── B02 Browser and runtime capability evidence
│   ├── B03 Fallback, startup escalation and promotion
│   ├── B04 Provider selection, costs and execution recipes
│   └── B05 Provider acquisition and shared runtimes
├── C  Sources, inspection and remux (5)
│   ├── C01 Source adapters and local byte access
│   ├── C02 Remote ranges, authorization and I/O workers
│   ├── C03 Fast inspection and media metadata
│   ├── C04 FFmpeg ownership and remux production
│   └── C05 Remux output, buffering and MSE integration
├── D  Playback backends and streaming (4)
│   ├── D01 Native media backend
│   ├── D02 Shaka backend, tracks and quality
│   ├── D03 Shaka networking and recovery
│   └── D04 Wasm and cooperative software backends
├── E  Engine execution, decoding and output (6)
│   ├── E01 Playback hosts, workers and scheduling
│   ├── E02 Browser decoders, mailboxes and frame ordering
│   ├── E03 Audio services, PCM and worklets
│   ├── E04 Video presentation and GPU resource lifetime
│   ├── E05 Codec kernels and audio adaptation
│   └── E06 Engine preparation, assets and runtime isolation
├── F  Subtitles and previews (5)
│   ├── F01 Subtitles, captions and overlays
│   ├── F02 Preview authority, controller and cache
│   ├── F03 Preview pregeneration, strategies and sampling
│   ├── F04 Preview providers, extraction and images
│   └── F05 Scrubber preview interaction
├── G  Player UI and application integrations (5)
│   ├── G01 Player component lifecycle and queue
│   ├── G02 Controls, shortcuts and timeline navigation
│   ├── G03 Layout, presentation modes and accessibility
│   ├── G04 Advanced settings and component controls
│   └── G05 Application bindings and media adapters
└── H  Build, delivery and project assurance (4)
    ├── H01 Native builds, toolchains and upstream patches
    ├── H02 Packages, bundler, CLI and deployment
    ├── H03 Verification infrastructure and evidence
    └── H04 Documentation, licensing and policy coherence
```

## 4. Component ownership cards

**Reading the cards.** Source anchors are inspected filenames/directories useful for finding the implementation, not exhaustive file ownership or permission globs. Read neighboring code and the current import/asset closure before proposing changes. A directory ending in `/` must be expanded before granting writes. The separate **Boundary** statement controls integration and shared-file access. Existing test anchors identify likely starting checks; inspect their setup, prerequisites and assertions before using them.

Every component inherits the common loop in §8, the verification rules in §9 and the no-overlap rules in §6. Code, test and documentation changes all need an exact task write set. A listed reviewer is a logical domain, not an invented GitHub account or team.

### A. Session, public API and control

#### A01 — Public API, types and exports

**Owns:** Public names, option validation contracts, event/error shapes, declaration compatibility and supported import surfaces.

**Source anchors:** [`src/index.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/index.ts); [`src/core.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/core.ts); [`src/types.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/types.ts); [`src/runtime-types.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/runtime-types.ts); [`src/contracts.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/contracts.ts); [`src/components.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/components.ts); [`src/internal/backend.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/backend.ts).

**Starting tests:** [`tests/api-stability/contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/contracts.mjs); [`tests/api-stability/consumer-types.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/consumer-types.ts); [`tests/public-api-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/public-api-state.mjs); [`tests/public-api.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/public-api.mjs).

**Invariant:** A public state/event must describe the accepted operation and source. Internal refactoring must not silently change public behavior, optionality, units or error semantics.

**Boundary:** A01 is the schema steward, not the owner of every implementation using the schema. Changes to public contracts require affected provider, backend and consumer reviewers. Package export metadata is integrated by H02.

**Smaller scopes:** `A01.inputs` — Inputs, validation and defaults; `A01.observations` — Events, snapshots and errors; `A01.compatibility` — Types and import-surface compatibility.

**Verification:** V1 → V2. **Review with:** A02, A06, G05, H02.

#### A02 — Composed player and source lifecycle

**Owns:** The top-level Player composition, source replacement, operation/session identities, candidate acceptance and retirement.

**Source anchors:** [`src/unified-player.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/unified-player.ts); [`src/internal/machine/transition.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/transition.ts); [`src/internal/machine/state.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/state.ts); [`src/internal/machine/operations.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/operations.ts); [`src/internal/machine/source.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/source.ts); [`src/internal/machine/source-preparation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/source-preparation.ts); [`src/internal/machine/source-application.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/source-application.ts); [`src/internal/machine/source-positioning.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/source-positioning.ts); [`src/internal/machine/source-acceptance.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/source-acceptance.ts).

**Starting tests:** [`tests/api-stability/source-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/source-state.mjs); [`tests/api-stability/operation-state-exploration.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/operation-state-exploration.mjs); [`tests/api-stability/player-session-fault.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/player-session-fault.mjs); [`tests/api-stability/player-teardown.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/player-teardown.mjs).

**Invariant:** Only the current source, session and operation may commit. Late completion cannot revive retired state; failed candidates cannot corrupt the accepted session.

**Boundary:** Single writer for unified-player.ts and the composed transition/state hubs. Other agents may audit them and submit integration requests, but cannot independently patch different regions concurrently.

**Smaller scopes:** `A02.acceptance` — Open, replace and candidate acceptance; `A02.authority` — Operation identity and stale completions; `A02.retirement` — Cancellation, faults and teardown.

**Verification:** V1 → V2. **Review with:** A03, A05, B01, D01, D04.

#### A03 — Transport, seeking and playback boundaries

**Owns:** Play/pause intent, latest-seek semantics, readiness, seek settlement, loop/excerpt behavior and backend requests.

**Source anchors:** [`src/internal/machine/player-transport.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/player-transport.ts); [`src/internal/machine/player-actions.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/player-actions.ts); [`src/internal/machine/player-readiness.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/player-readiness.ts); [`src/internal/machine/playback.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/playback.ts); [`src/internal/machine/playback-boundary.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/playback-boundary.ts); [`src/internal/machine/backend-requests.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/backend-requests.ts); [`src/internal/machine/playback-deadlines.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/playback-deadlines.ts).

**Starting tests:** [`tests/api-stability/player-transport-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/player-transport-state.mjs); [`tests/api-stability/playback-boundary.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/playback-boundary.mjs); [`tests/seek-boundary-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/seek-boundary-contracts.mjs); [`tests/play-pause-cancellation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/play-pause-cancellation.mjs); [`tests/seek-delayed-observation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/seek-delayed-observation.mjs).

**Invariant:** A superseded seek cannot resume playback or publish success. Excerpt, seekable and audiovisual boundaries agree; an explicit pause defeats stale resume intent.

**Boundary:** A03 owns transport semantics, not DOM shortcuts (G02), scrubber previews (F05), or backend-specific mechanics (D01/D04). A02 integrates changes to the composed Player.

**Smaller scopes:** `A03.intent` — Play/pause and cancellation ordering; `A03.seeking` — Latest seek, settlement and readiness; `A03.bounds` — Excerpt, loop and end-of-media boundaries.

**Verification:** V1 → V2. **Review with:** A02, D01, D04, F05, G02.

#### A04 — Settings, track selection and attachments

**Owns:** Desired versus accepted settings, transactional changes, selected-track identity, subtitle/font attachments and shared buffering policy.

**Source anchors:** [`src/internal/machine/settings.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/settings.ts); [`src/internal/machine/advanced-controls.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/advanced-controls.ts); [`src/internal/machine/attachments.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/attachments.ts); [`src/internal/machine/track-selection.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/track-selection.ts); [`src/internal/machine/track-confirmation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/track-confirmation.ts); [`src/internal/machine/track-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/track-policy.ts); [`src/internal/track-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/track-policy.ts); [`src/internal/buffering.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/buffering.ts); [`src/internal/machine/buffering-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/buffering-policy.ts).

**Starting tests:** [`tests/api-stability/settings-transactions.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/settings-transactions.mjs); [`tests/api-stability/settings-observation-race.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/settings-observation-race.mjs); [`tests/api-stability/track-selection-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/track-selection-state.mjs); [`tests/api-stability/attachment-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/attachment-state.mjs); [`tests/track-policy.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/track-policy.mjs).

**Invariant:** Failed setting changes leave a coherent accepted configuration. Track confirmation belongs to the current source/session and respects explicit user selection and policy.

**Boundary:** G04 renders settings; A04 owns their meaning. F01 owns subtitle execution. C05 and D02 implement buffering rather than redefining the shared policy. Public schema changes go through A01.

**Smaller scopes:** `A04.transactions` — Settings commit, rollback and reopen; `A04.tracks` — Track selection and confirmation; `A04.attachments` — Attachment lifetime and preferences.

**Verification:** V1 → V2. **Review with:** A01, A02, D01, D02, F01, G04.

#### A05 — Effect execution and resource ownership

**Owns:** Effect authority, scheduling/retirement rules, acquisition/release accounting, cleanup outcomes and generic asynchronous policy.

**Source anchors:** [`src/internal/machine/protocol.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/protocol.ts); [`src/internal/machine/effect-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/effect-runtime.ts); [`src/internal/machine/resource-ledger.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/resource-ledger.ts); [`src/internal/machine/async-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/async-policy.ts); [`src/internal/effects/runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/effects/runtime.ts); [`src/internal/effects/resources.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/effects/resources.ts).

**Starting tests:** [`tests/api-stability/effect-runtime-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/effect-runtime-state.mjs); [`tests/api-stability/resource-ledger-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/resource-ledger-state.mjs); [`tests/api-stability/resource-ledger-monotonic.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/resource-ledger-monotonic.mjs); [`tests/api-stability/resource-acquisition.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/resource-acquisition.mjs); [`tests/api-stability/player-executor.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/player-executor.mjs).

**Invariant:** Every acquired resource has one responsible owner and a valid release path. Retiring authority prevents new effects but must not suppress required physical cleanup.

**Boundary:** This component owns generic resource/effect machinery, not every resource user. Protocol changes require both producer and consumer review. A02 owns root composition edits.

**Smaller scopes:** `A05.authority` — Effect identity, lanes and retirement; `A05.ledger` — Acquisition, transfer and release accounting; `A05.cleanup` — Failure, cancellation and reentrant cleanup.

**Verification:** V1 → V2. **Review with:** A02, B05, E01, E02, F02.

#### A06 — Publication, observations and diagnostics

**Owns:** Public projections, observation capture, monitoring/watchdogs, bounded traces, error classification/redaction and performance attribution data.

**Source anchors:** [`src/internal/machine/player-publication.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/player-publication.ts); [`src/internal/machine/player-monitor.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/player-monitor.ts); [`src/internal/machine/selectors.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/selectors.ts); [`src/internal/machine/telemetry.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/telemetry.ts); [`src/internal/machine/trace.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/trace.ts); [`src/internal/machine/data.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/data.ts); [`src/internal/machine/stage-taps.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/stage-taps.ts); [`src/internal/state.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/state.ts); [`src/internal/errors.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/errors.ts); [`src/internal/playback-statistics.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/playback-statistics.ts); [`src/internal/watchdogs.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/watchdogs.ts); [`src/internal/effects/observations.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/effects/observations.ts); [`src/internal/effects/media-observations.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/effects/media-observations.ts).

**Starting tests:** [`tests/api-stability/player-publication-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/player-publication-state.mjs); [`tests/api-stability/telemetry.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/telemetry.mjs); [`tests/api-stability/trace-replay.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/trace-replay.mjs); [`tests/api-stability/error-classification.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/error-classification.mjs); [`tests/watchdogs.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/watchdogs.mjs).

**Invariant:** Publication is coherent under reentrant callbacks and stale observations. Diagnostics are bounded, redact sensitive URLs/headers and do not fabricate readiness, timing or recovery facts.

**Boundary:** Feature owners emit evidence; A06 defines shared publication and attribution semantics. H03 owns measurement methodology and runners. Changing error/event contracts also requires A01.

**Smaller scopes:** `A06.publication` — Snapshot consistency and reentrancy; `A06.tracing` — Bounded traces and replay diagnostics; `A06.monitoring` — Watchdogs, errors and attribution.

**Verification:** V1 → V2. **Review with:** A01, A02, D03, H03.

### B. Routing, capabilities and providers

#### B01 — Route discovery, inspection and admission

**Owns:** Which media facts are required, when inspection runs, how evidence is scoped, and which routes are eligible.

**Source anchors:** [`src/internal/machine/route-discovery.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-discovery.ts); [`src/internal/machine/route-inspection.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-inspection.ts); [`src/internal/machine/route-evidence.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-evidence.ts); [`src/internal/machine/route-admission.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-admission.ts); [`src/internal/machine/route-state.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-state.ts); [`src/internal/machine/routing.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/routing.ts); [`src/internal/probe-requirements.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/probe-requirements.ts).

**Starting tests:** [`tests/api-stability/route-discovery-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/route-discovery-state.mjs); [`tests/api-stability/route-inspection-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/route-inspection-state.mjs); [`tests/api-stability/route-admission-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/route-admission-state.mjs); [`tests/api-stability/route-evidence-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/route-evidence-state.mjs); [`tests/probe-requirements.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/probe-requirements.mjs).

**Invariant:** Admission must be supported by current source, browser and deployment evidence. Incomplete inspection or stale evidence cannot be treated as a positive capability result.

**Boundary:** C03 extracts facts; B01 decides whether they justify routing. B02 probes browser capabilities, B04 binds implementations, and B03 owns recovery/promotion policy.

**Smaller scopes:** `B01.discovery` — Initial discovery and required facts; `B01.evidence` — Evidence identity and invalidation; `B01.admission` — Eligibility and refusal reasons.

**Verification:** V1 → V2. **Review with:** A02, B02, B03, B04, C03.

#### B02 — Browser and runtime capability evidence

**Owns:** Browser support queries, late capability discovery, compatibility guards and exact configuration qualification.

**Source anchors:** [`src/internal/browser-media-capability.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/browser-media-capability.ts); [`src/internal/browser-evidence-adapters.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/browser-evidence-adapters.ts); [`src/internal/media-capabilities.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/media-capabilities.ts); [`src/internal/runtime-capability.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/runtime-capability.ts); [`src/internal/execution-capabilities.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/execution-capabilities.ts); [`src/internal/machine/capabilities.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/capabilities.ts); [`src/internal/machine/browser-compatibility.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/browser-compatibility.ts).

**Starting tests:** [`tests/browser-media-capability.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/browser-media-capability.mjs); [`tests/media-capabilities.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/media-capabilities.mjs); [`tests/runtime-capability-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/runtime-capability-contracts.mjs); [`tests/native-readiness-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-readiness-contracts.mjs); [`tests/safari-decoder-guard.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/safari-decoder-guard.mjs); [`tests/media-capabilities-late-browser.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/media-capabilities-late-browser.mjs).

**Invariant:** API availability is not equivalent to successful decoding or qualified output. Negative, unknown, interrupted and positive evidence remain distinct and correctly scoped.

**Boundary:** E02 owns codec configuration mechanics. B01 consumes evidence. Browser/device support expansions require real output tests, not merely a successful support-query mock.

**Smaller scopes:** `B02.queries` — Capability query behavior; `B02.scope` — Caching, identity and late updates; `B02.qualification` — Configuration-specific browser evidence.

**Verification:** V1 → V2. **Review with:** B01, D01, E02, H03.

#### B03 — Fallback, startup escalation and promotion

**Owns:** Tier attempts, startup budgets, promotion/recovery choices and decode policy without redefining public playback modes.

**Source anchors:** [`src/internal/tier-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/tier-policy.ts); [`src/internal/startup-escalation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/startup-escalation.ts); [`src/internal/decode-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/decode-policy.ts); [`src/internal/machine/decode-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/decode-policy.ts); [`src/internal/machine/startup.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/startup.ts); [`src/internal/machine/route-recovery.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-recovery.ts); [`src/internal/machine/route-promotion.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/route-promotion.ts).

**Starting tests:** [`tests/tier-policy.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/tier-policy.mjs); [`tests/native-startup-recovery.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-startup-recovery.mjs); [`tests/pause-promotion.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/pause-promotion.mjs); [`tests/startup-escalation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/startup-escalation.mjs); [`tests/api-stability/route-recovery-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/route-recovery-state.mjs); [`tests/api-stability/route-promotion-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/route-promotion-state.mjs).

**Invariant:** Fallback attempts are bounded and evidence-driven. Recovery or promotion cannot override a newer source, user pause, explicit route constraint or unsupported required feature.

**Boundary:** D03 owns Shaka network recovery mechanics; B03 owns cross-route policy. Route failure does not grant permission to silently reduce fidelity or bypass A04 settings.

**Smaller scopes:** `B03.startup` — Startup budgets and escalation; `B03.fallback` — Failure classification and bounded alternatives; `B03.promotion` — Late improvement without intent loss.

**Verification:** V1 → V2. **Review with:** A02, A03, A04, B01, D03.

#### B04 — Provider selection, costs and execution recipes

**Owns:** Provider inventories, preference/cost resolution and mapping eligible plans to execution recipes and component combinations.

**Source anchors:** [`src/internal/provider-catalog.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-catalog.ts); [`src/internal/provider-resolution.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-resolution.ts); [`src/internal/provider-plan-resolution.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-plan-resolution.ts); [`src/internal/provider-cost.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-cost.ts); [`src/internal/component-selection.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/component-selection.ts); [`src/internal/component-recipes.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/component-recipes.ts); [`src/internal/execution-recipes.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/execution-recipes.ts); [`src/internal/media-providers.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/media-providers.ts); [`src/internal/playback-plans.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/playback-plans.ts); [`src/internal/machine/playback-plans.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/playback-plans.ts); [`src/internal/selection.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/selection.ts); [`src/internal/external-decoder-selection.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/external-decoder-selection.ts); [`src/internal/webgpu-codecs.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/webgpu-codecs.ts).

**Starting tests:** [`tests/component-selection.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/component-selection.mjs); [`tests/provider-preferences.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-preferences.mjs); [`tests/provider-resolution.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-resolution.mjs); [`tests/plan-admission.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/plan-admission.mjs); [`tests/native-selection.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-selection.mjs).

**Invariant:** A cheaper provider is not eligible unless it satisfies the same required output contract. Missing assets and unqualified combinations must produce explicit rejection, not optimistic selection.

**Boundary:** B05 acquires providers; H02 packages them; E05 owns codec correctness. The mpv provider is treated as an atomic implementation boundary unless a separately approved design changes it.

**Smaller scopes:** `B04.catalog` — Inventory and identity; `B04.selection` — Preferences, cost and contract-preserving choice; `B04.recipes` — Valid component composition.

**Verification:** V1 → V2. **Review with:** A01, B01, B05, E05, H02.

#### B05 — Provider acquisition and shared runtimes

**Owns:** Runtime instances, lazy acquisition, provider updates, deployment identity and shared asset/cache ownership.

**Source anchors:** [`src/runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/runtime.ts); [`src/internal/provider-acquisition.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-acquisition.ts); [`src/internal/provider-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-runtime.ts); [`src/internal/provider-build.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-build.ts); [`src/internal/provider-deployment.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-deployment.ts); [`src/internal/provider-deployment-errors.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-deployment-errors.ts); [`src/internal/provider-modules.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/provider-modules.ts); [`src/internal/shared-provider-assets.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shared-provider-assets.ts); [`src/internal/assets.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/assets.ts); [`src/internal/machine/provider-acquisition.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/provider-acquisition.ts); [`src/internal/machine/provider-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/provider-runtime.ts); [`src/internal/machine/provider-updates.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/provider-updates.ts); [`src/internal/machine/shared-assets.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shared-assets.ts); [`src/internal/machine/shared-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shared-runtime.ts).

**Starting tests:** [`tests/provider-acquisition.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-acquisition.mjs); [`tests/provider-owner-failures.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-owner-failures.mjs); [`tests/provider-runtime.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-runtime.mjs); [`tests/shared-runtime.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shared-runtime.mjs); [`tests/runtime-provider-promotion.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/runtime-provider-promotion.mjs); [`tests/asset-deployment.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/asset-deployment.mjs).

**Invariant:** Shared resources survive while valid owners need them, but retired owners cannot reuse or release a successor's resource. Deployment changes invalidate the correct identities.

**Boundary:** E06 initializes engine-level assets; B05 manages shared provider-level ownership. A01 owns runtime type contracts and H02 owns delivered manifests and layout.

**Smaller scopes:** `B05.acquisition` — Lazy load, concurrent owners and failure; `B05.updates` — Provider revisions and deployment changes; `B05.sharing` — Cache identity, reuse and disposal.

**Verification:** V1 → V2. **Review with:** A01, A05, B04, E06, H02.

### C. Sources, inspection and remux

#### C01 — Source adapters and local byte access

**Owns:** Public custom source materialization, local files/ArrayBuffers, safe byte offsets and source-level policy.

**Source anchors:** [`src/sources.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/sources.ts); [`web/file-reader.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/file-reader.js); [`src/internal/machine/byte-reader.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/byte-reader.ts); [`src/internal/machine/local-reader.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/local-reader.ts); [`src/internal/machine/source-policy.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/source-policy.ts).

**Starting tests:** [`tests/file-reader.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/file-reader.mjs); [`tests/api-stability/byte-reader.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/byte-reader.mjs); [`tests/api-stability/local-reader-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/local-reader-state.mjs); [`tests/large-files.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/large-files.mjs).

**Invariant:** Reads return only the requested bytes from the intended source. Length/offset validation is overflow-safe and cancellation cannot expose a successor source's data.

**Boundary:** A02 owns source session lifecycle; C02 owns HTTP/range transport; C03 interprets bytes. Custom-source disposal semantics require A01 and A05 review.

**Smaller scopes:** `C01.adapters` — Custom source input and materialization; `C01.reads` — Offsets, partial reads and large files; `C01.lifetime` — Local handles and cancellation.

**Verification:** V1 → V2. **Review with:** A01, A02, A05, C02, C03.

#### C02 — Remote ranges, authorization and I/O workers

**Owns:** Range deadlines, bounded transport/cache behavior, representation identity and authorization updates across worker/native bridges.

**Source anchors:** [`web/range-reader.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/range-reader.js); [`web/io-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/io-worker.js); [`web/private-mpv/range-source.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/range-source.js); [`src/internal/machine/range-reader.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/range-reader.ts); [`src/internal/machine/io-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/io-worker.ts); [`src/internal/machine/private-range-source.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-range-source.ts); [`native/stream_bridge.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/stream_bridge.c); [`native/stream_bridge.h`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/stream_bridge.h).

**Starting tests:** [`tests/range-reader.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/range-reader.mjs); [`tests/range-reader-deadline.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/range-reader-deadline.mjs); [`tests/api-stability/range-reader-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/range-reader-state.mjs); [`tests/api-stability/io-worker.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/io-worker.mjs); [`tests/api-stability/private-range-source.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/private-range-source.mjs).

**Invariant:** Ranges from different representations cannot be spliced into one source. Retries, timeouts and refreshed authorization preserve origin policy, bounded work and cancellation authority.

**Boundary:** D03 owns Shaka-specific network callbacks; this component owns generic finite-source transport. Native/worker ABI changes require the consumer engine owner and H01.

**Smaller scopes:** `C02.representation` — ETag, size and representation changes; `C02.requests` — Deadlines, retries, cancellation and backpressure; `C02.authorization` — Allowed origins and authorization renewal.

**Verification:** V1 → V2. **Review with:** A02, A05, D03, E01, H01.

#### C03 — Fast inspection and media metadata

**Owns:** Byte-to-media-fact interpretation, cheap inspection eligibility, metadata budgets and fallback to broader probing.

**Source anchors:** [`web/fast-source-inspector.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/fast-source-inspector.js); [`web/source-probe.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/source-probe.js); [`src/internal/machine/media-facts.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/media-facts.ts); [`src/internal/machine/media-info.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/media-info.ts); [`src/internal/machine/metadata-budget.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/metadata-budget.ts).

**Starting tests:** [`tests/fast-source-inspector.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/fast-source-inspector.mjs); [`tests/probe-requirements.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/probe-requirements.mjs); [`tests/api-stability/metadata-budget.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/metadata-budget.mjs); [`tests/api-stability/initial-inspection-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/initial-inspection-state.mjs).

**Invariant:** A parser either provides justified facts or declines. Unsupported/truncated containers must not become invented metadata, uncontrolled allocation or falsely qualified direct playback.

**Boundary:** B01 owns use/invalidation of evidence; C03 owns its derivation. Changing a parser cannot independently broaden advertised route support. Reuse reference fixtures without treating FFmpeg output as infallible.

**Smaller scopes:** `C03.parsing` — Container fields and malformed input; `C03.budget` — Read/allocation budgets and large metadata; `C03.fallback` — Decline behavior and cross-inspector comparison.

**Verification:** V1 → V2. **Review with:** B01, B02, C01, C02, H03.

#### C04 — FFmpeg ownership and remux production

**Owns:** FFmpeg worker/port ownership, remux source/producer lifecycle, packet processing and native remux bridge behavior.

**Source anchors:** [`web/native-remux-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/native-remux-worker.js); [`web/native-remux-source-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/native-remux-source-worker.js); [`web/private-remux.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-remux.js); [`web/private-ffmpeg/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/web/private-ffmpeg/); [`src/internal/machine/ffmpeg-owner.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/ffmpeg-owner.ts); [`src/internal/machine/ffmpeg-bridge.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/ffmpeg-bridge.ts); [`src/internal/machine/remux-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-worker.ts); [`src/internal/machine/remux-source-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-source-worker.ts); [`src/internal/machine/remux-port-reader.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-port-reader.ts); [`src/internal/machine/remux-producer.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-producer.ts); [`src/internal/machine/remux-lifecycle.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-lifecycle.ts); [`native/remux/remux.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/remux/remux.c).

**Starting tests:** [`tests/api-stability/ffmpeg-owner-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/ffmpeg-owner-state.mjs); [`tests/api-stability/ffmpeg-bridge-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/ffmpeg-bridge-state.mjs); [`tests/api-stability/remux-producer-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/remux-producer-state.mjs); [`tests/api-stability/remux-lifecycle.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/remux-lifecycle.mjs); [`tests/remux-regressions.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/remux-regressions.mjs).

**Invariant:** Packet production has bounded ownership and a definite drain/EOF path. Cancellation cannot publish old packets or retain a dead worker/port/native allocation.

**Boundary:** C05 owns append/consumer scheduling and output packaging. E06 owns runtime flavor admission/loading; H01 owns builds. Folder anchors require per-file expansion before write assignment.

**Smaller scopes:** `C04.ownership` — Worker, bridge and port lifetime; `C04.production` — Packet timestamps, drain and cancellation; `C04.native` — Native remux correctness and malformed packets.

**Verification:** V1 → V2; V3 for native/ABI changes. **Review with:** A05, C02, C05, E06, H01.

#### C05 — Remux output, buffering and MSE integration

**Owns:** Output negotiation, MP4 views/splitting, remux scheduling, buffer accounting, append lifecycle and end-of-stream presentation coverage.

**Source anchors:** [`web/native-remux-player.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/native-remux-player.js); [`web/native-mse-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/native-mse-worker.js); [`web/worker-remux-controller.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/worker-remux-controller.js); [`web/progressive-mp4.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/progressive-mp4.js); [`web/split-mp4.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/split-mp4.js); [`web/selected-mp4-view.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/selected-mp4-view.js); [`web/remux-packaging.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/remux-packaging.js); [`src/internal/machine/progressive-mp4.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/progressive-mp4.ts); [`src/internal/machine/split-mp4.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/split-mp4.ts); [`src/internal/machine/remux-controller.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-controller.ts); [`src/internal/machine/remux-buffer.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-buffer.ts); [`src/internal/machine/remux-negotiation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-negotiation.ts); [`src/internal/machine/remux-output.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-output.ts); [`src/internal/machine/remux-packaging.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-packaging.ts); [`src/internal/machine/remux-scheduling.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-scheduling.ts).

**Starting tests:** [`tests/remux-buffering.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/remux-buffering.mjs); [`tests/remux-eof-coverage.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/remux-eof-coverage.mjs); [`tests/api-stability/remux-controller.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/remux-controller.mjs); [`tests/api-stability/remux-bounds.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/remux-bounds.mjs); [`tests/remux-packaging-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/remux-packaging-contracts.mjs); [`tests/remux-negotiation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/remux-negotiation.mjs).

**Invariant:** Append/backpressure work stays bounded and media timelines remain consistent through seek, flush and EOF. Completion is not declared while required audio/video output is missing.

**Boundary:** C04 supplies packets. D01 owns the host native backend; D02 owns Shaka-managed MSE, which must not gain a competing scheduler here. Output-contract changes require B04.

**Smaller scopes:** `C05.negotiation` — Container/output contracts; `C05.buffering` — Append queues, memory and backpressure; `C05.timeline` — Seek, drain and audiovisual coverage.

**Verification:** V1 → V2. **Review with:** A03, A04, B04, C04, D01.

### D. Playback backends and streaming

#### D01 — Native media backend

**Owns:** HTML media element loading, controls, event observation, readiness and retirement in the native backend.

**Source anchors:** [`src/internal/native-player.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/native-player.ts); [`src/internal/machine/native-backend.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-backend.ts); [`src/internal/machine/native-load.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-load.ts); [`src/internal/machine/native-controls.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-controls.ts); [`src/internal/machine/native-wait.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-wait.ts).

**Starting tests:** [`tests/api-stability/native-backend-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/native-backend-state.mjs); [`tests/api-stability/native-load-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/native-load-state.mjs); [`tests/api-stability/native-controls-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/native-controls-state.mjs); [`tests/native-seek-frame-race.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-seek-frame-race.mjs); [`tests/native-startup-recovery.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-startup-recovery.mjs).

**Invariant:** The active element and accepted session agree. DOM media events cannot confirm a stale load/seek; disposal removes observations without disrupting another accepted session.

**Boundary:** Native audio service belongs to E03, subtitles to F01 and remux preparation to C04/C05. native-player.ts remains a single-writer integration file for those services.

**Smaller scopes:** `D01.load` — Element load and startup evidence; `D01.control` — Play, pause and seek observation; `D01.teardown` — Listeners, URLs and stale media events.

**Verification:** V1 → V2. **Review with:** A02, A03, C05, E03, F01.

#### D02 — Shaka backend, tracks and quality

**Owns:** Shaka backend/runtime integration, manifest lifecycle, track/variant observation and quality/ABR policy application.

**Source anchors:** [`src/internal/shaka-backend.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shaka-backend.ts); [`src/internal/shaka-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shaka-runtime.ts); [`src/internal/shaka-api.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shaka-api.ts); [`src/internal/shaka-abr.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shaka-abr.ts); [`src/internal/machine/shaka-backend.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shaka-backend.ts); [`src/internal/machine/shaka-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shaka-runtime.ts); [`src/internal/machine/shaka-selection.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shaka-selection.ts); [`src/internal/machine/shaka-observation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shaka-observation.ts); [`src/internal/machine/quality-switching.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/quality-switching.ts).

**Starting tests:** [`tests/shaka-backend.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-backend.mjs); [`tests/quality-switching.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/quality-switching.mjs); [`tests/api-stability/shaka-backend-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/shaka-backend-state.mjs); [`tests/api-stability/shaka-selection.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/shaka-selection.mjs); [`tests/shaka-lifecycle.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-lifecycle.mjs).

**Invariant:** Track/quality state reflects the current Shaka instance and source. Replay needs new output evidence; ABR and manual policy remain consistent without a second manifest/MSE scheduler.

**Boundary:** D03 owns network/recovery policy adapters; H02 owns provider-shaka package delivery. Changes in shaka-backend.ts go through D02 even when initiated by a network/subtitle agent.

**Smaller scopes:** `D02.lifecycle` — Load, unload, replay and manifest timeline; `D02.selection` — Tracks, variants and manual quality; `D02.abr` — Adaptive quality and observable state.

**Verification:** V1 → V2. **Review with:** A03, A04, D03, F01, H02.

#### D03 — Shaka networking and recovery

**Owns:** Streaming request observations, retry/recovery transitions, network error classification and source-scoped recovery signals.

**Source anchors:** [`src/internal/shaka-network.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shaka-network.ts); [`src/internal/shaka-recovery.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/shaka-recovery.ts); [`src/internal/machine/shaka-network.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shaka-network.ts); [`src/internal/machine/shaka-recovery.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/shaka-recovery.ts).

**Starting tests:** [`tests/shaka-network.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-network.mjs); [`tests/shaka-recovery.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-recovery.mjs); [`tests/api-stability/shaka-network-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/shaka-network-state.mjs); [`tests/api-stability/live-fault-server-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/live-fault-server-contracts.mjs); [`tests/shaka-lifecycle.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-lifecycle.mjs).

**Invariant:** Recovery state is driven by observed current-source work, not guessed countdowns. Retired requests cannot recover or fail a new source; retry activity remains bounded and visible.

**Boundary:** D02 integrates backend callbacks. C02 owns non-Shaka range transport. A06/A01 review public diagnostics/events, and B03 reviews any proposed cross-route fallback.

**Smaller scopes:** `D03.requests` — Request/response identity and cancellation; `D03.recovery` — Recoverable versus terminal transitions; `D03.signals` — Accurate public recovery evidence.

**Verification:** V1 → V2. **Review with:** A01, A06, B03, C02, D02.

#### D04 — Wasm and cooperative software backends

**Owns:** Wasm backend lifecycle, software/private backend settings and seek mechanics, including pause/resume and retirement.

**Source anchors:** [`src/internal/wasm-player.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/wasm-player.ts); [`src/internal/private-software-player.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/private-software-player.ts); [`src/internal/machine/wasm-lifecycle.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/wasm-lifecycle.ts); [`src/internal/machine/wasm-seek.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/wasm-seek.ts); [`src/internal/machine/wasm-settings.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/wasm-settings.ts); [`src/internal/machine/private-software.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-software.ts).

**Starting tests:** [`tests/api-stability/wasm-lifecycle.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/wasm-lifecycle.mjs); [`tests/api-stability/wasm-seek.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/wasm-seek.mjs); [`tests/api-stability/wasm-settings.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/wasm-settings.mjs); [`tests/private-software-player.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-software-player.mjs); [`tests/private-mpv-eof-race.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-mpv-eof-race.mjs).

**Invariant:** Backend-local readiness and seek completion honor the current session and user intent. EOF, cancellation and teardown settle operations without resurrecting retired playback.

**Boundary:** E01 owns worker/scheduler execution, E06 runtime admission, E02/E03/E04 the decode/output paths. D04 must not duplicate their clocks, ownership or qualification policy.

**Smaller scopes:** `D04.lifecycle` — Initialization, readiness and teardown; `D04.seeking` — Software seek, settlement and resume; `D04.settings` — Backend settings, EOF and route parity.

**Verification:** V1 → V2. **Review with:** A02, A03, E01, E02, E03, E06.

### E. Engine execution, decoding and output

#### E01 — Playback hosts, workers and scheduling

**Owns:** Worker message execution, playback hosts, cooperative continuation scheduling and worker-tree termination, including the lower-level BrowserPlayer.

**Source anchors:** [`src/player.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player.ts); [`web/engine-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/engine-worker.js); [`web/retained-engine-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/retained-engine-worker.js); [`web/software-full-engine-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/software-full-engine-worker.js); [`web/private-mpv/playback-host.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/playback-host.js); [`web/private-mpv/playback-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/playback-worker.js); [`web/private-mpv/scheduler.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/scheduler.js); [`web/private-mpv/continuations.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/continuations.js); [`src/internal/machine/playback-host.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/playback-host.ts); [`src/internal/machine/private-playback-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-playback-worker.ts); [`src/internal/machine/private-scheduler.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-scheduler.ts); [`src/internal/machine/legacy-playback-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/legacy-playback-worker.ts); [`src/internal/machine/legacy-adaptive-decode.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/legacy-adaptive-decode.ts).

**Starting tests:** [`tests/private-playback-worker.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-playback-worker.mjs); [`tests/private-playback-host.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-playback-host.mjs); [`tests/api-stability/private-scheduler.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/private-scheduler.mjs); [`tests/api-stability/private-continuations.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/private-continuations.mjs); [`tests/api-stability/legacy-playback-worker-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/legacy-playback-worker-state.mjs).

**Invariant:** Old continuations and messages cannot execute against a new lifetime. Pausing/destroying stops inappropriate scheduling and drains or retires every pending command deterministically.

**Boundary:** E02/E03/E04 own decoder/audio/presentation endpoints. Legacy or experimental entrypoints require reachability classification before modification, not indiscriminate parity rewrites.

**Smaller scopes:** `E01.protocol` — Host/worker requests and failures; `E01.scheduler` — Continuation fairness and cancellation; `E01.termination` — Worker-tree cleanup and bounded pending work.

**Verification:** V1 → V2. **Review with:** A05, D04, E02, E03, E06.

#### E02 — Browser decoders, mailboxes and frame ordering

**Owns:** Video codec configuration, WebCodecs-facing decode mechanics, retained-decoder/mailbox ownership and frame ordering.

**Source anchors:** [`web/browser-decoder-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/browser-decoder-worker.js); [`web/retained-decoder-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/retained-decoder-worker.js); [`web/external-video-decoder.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/external-video-decoder.js); [`web/video-codec-config.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/video-codec-config.js); [`web/private-mpv/decoder-mailbox.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/decoder-mailbox.js); [`web/private-mpv/retained-decoder.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/retained-decoder.js); [`src/internal/machine/external-video-decoder.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/external-video-decoder.ts); [`src/internal/machine/private-decoder-mailbox.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-decoder-mailbox.ts); [`src/internal/machine/private-retained-decoder.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-retained-decoder.ts); [`src/internal/machine/legacy-decoder-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/legacy-decoder-worker.ts); [`src/internal/machine/video-frame-order.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/video-frame-order.ts); [`native/vd_browser.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/vd_browser.c); [`native/browser_decoder_bridge.h`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/browser_decoder_bridge.h).

**Starting tests:** [`tests/browser-decoder-worker.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/browser-decoder-worker.mjs); [`tests/video-frame-order.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/video-frame-order.mjs); [`tests/private-decoder-mailbox.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-decoder-mailbox.mjs); [`tests/private-retained-decoder.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-retained-decoder.mjs); [`tests/video-codec-config.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/video-codec-config.mjs); [`tests/api-stability/native-decoder-retirement.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/native-decoder-retirement.mjs).

**Invariant:** Decode outputs belong to the current codec configuration/epoch; frames are consumed, transferred or closed exactly as ownership requires. Flush/reorder behavior cannot leak stale frames.

**Boundary:** B02 owns capability claims; E04 owns presentation; E01 owns worker scheduling. Shared message shapes and native bridges require producer/consumer agreement and H01 qualification.

**Smaller scopes:** `E02.configuration` — Codec configuration and reconfiguration; `E02.mailbox` — Transfer, cancellation and decoder lifetime; `E02.ordering` — PTS/reorder/flush behavior.

**Verification:** V1 → V2; V3 for native/ABI changes. **Review with:** A05, B02, E01, E04, H01.

#### E03 — Audio services, PCM and worklets

**Owns:** Native/private mpv audio services, PCM transport, worklet queues, audio-clock observations and native browser audio bridge.

**Source anchors:** [`src/internal/native-mpv-audio.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/native-mpv-audio.ts); [`src/internal/native-private-mpv-audio.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/native-private-mpv-audio.ts); [`src/internal/machine/native-audio.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-audio.ts); [`src/internal/machine/private-audio.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-audio.ts); [`src/internal/machine/private-audio-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-audio-worker.ts); [`src/internal/machine/private-pcm.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-pcm.ts); [`src/internal/machine/private-worklet.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-worklet.ts); [`src/internal/machine/pcm-worklet.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/pcm-worklet.ts); [`src/internal/machine/selective-worklet.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/selective-worklet.ts); [`web/audio-worklet.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/audio-worklet.js); [`web/selective-sync-worklet.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/selective-sync-worklet.js); [`web/private-mpv/audio-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/audio-worker.js); [`web/private-mpv/audio-worklet.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/audio-worklet.js); [`web/private-mpv/playback-pcm.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/playback-pcm.js); [`native/ao_browser.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/ao_browser.c); [`native/audio_bridge.h`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/audio_bridge.h).

**Starting tests:** [`tests/audio-worklet.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/audio-worklet.mjs); [`tests/private-pcm-worklet.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-pcm-worklet.mjs); [`tests/private-playback-pcm.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-playback-pcm.mjs); [`tests/native-audio-scheduling.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-audio-scheduling.mjs); [`tests/api-stability/native-audio-lifecycle.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/native-audio-lifecycle.mjs); [`tests/native-audio-diagnostics.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/native-audio-diagnostics.mjs).

**Invariant:** PCM queues are bounded, channel/rate contracts are explicit, and seek/pause/EOF retire the correct audio generation. A clock estimate must not be misreported as measured A/V sync.

**Boundary:** E05 owns decode/adaptation correctness; E03 owns output and synchronization mechanics. Changes affecting the native backend are integrated through D01, not separate edits to its hub.

**Smaller scopes:** `E03.pcm` — Format, channel, rate and transfer accounting; `E03.clock` — Pause, drift, delay and synchronization; `E03.drain` — Underrun, EOF and audio resource teardown.

**Verification:** V1 → V2. **Review with:** A03, D01, D04, E01, E05.

#### E04 — Video presentation and GPU resource lifetime

**Owns:** Retained frame presentation, YUV/RGB presentation, GPU surfaces and native software-frame output integration.

**Source anchors:** [`web/retained-video.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/retained-video.js); [`web/video-presenter.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/video-presenter.js); [`web/yuv-presenter.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/yuv-presenter.js); [`web/webgl-yuv-presenter.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/webgl-yuv-presenter.js); [`web/private-mpv/retained-presentation.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/retained-presentation.js); [`src/internal/machine/private-retained-presentation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-retained-presentation.ts); [`src/internal/machine/legacy-retained-presentation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/legacy-retained-presentation.ts); [`native/yuv-backend.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/yuv-backend.c).

**Starting tests:** [`tests/retained-video.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/retained-video.mjs); [`tests/private-retained-presentation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/private-retained-presentation.mjs); [`tests/yuv-presenter-acquisition.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/yuv-presenter-acquisition.mjs); [`tests/api-stability/private-retained-lease.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/private-retained-lease.mjs); [`tests/api-stability/legacy-retained-shell.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/legacy-retained-shell.mjs).

**Invariant:** Presentation respects timestamp, format, color/chroma and lifetime contracts. Hidden/stopped surfaces do not leak work, while required visible or PiP output continues.

**Boundary:** G03 owns DOM/fullscreen/viewport presentation; E04 owns video pixels and GPU resources. Experimental WebGPU codecs are not production-qualified merely because this owner can audit them.

**Smaller scopes:** `E04.fidelity` — Color, planes, strides and chroma; `E04.surfaces` — Frame retention and GPU resource release; `E04.scheduling` — Visible presentation and unchanged-frame work.

**Verification:** V1 → V2; V3 for native changes; V4 for performance claims. **Review with:** E01, E02, E03, G03, H03.

#### E05 — Codec kernels and audio adaptation

**Owns:** Native codec wrappers, lossless/output adaptation and maintained SIMD kernels, with narrowly assigned codec-family qualification jobs.

**Source anchors:** [`native/audio-codecs/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/native/audio-codecs/); [`native/adaptation/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/native/adaptation/); [`native/simd/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/native/simd/).

**Starting tests:** [`tests/provider-audio-builds.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-audio-builds.mjs); [`tests/provider-audio-repair.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-audio-repair.mjs); [`tests/provider-lossless-audio.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-lossless-audio.mjs); [`tests/provider-conformance-installed.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-conformance-installed.mjs); [`experiments/playback-performance/test-maintained-kernels.sh`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/experiments/playback-performance/test-maintained-kernels.sh).

**Invariant:** Optimized or smaller implementations preserve the declared output contract. Bit-exact claims need matching samples; lossy tolerances and reference versions must be explicit.

**Boundary:** H01 owns toolchain/build recipes; H02 package metadata; B04 eligibility. Individual provider implementation files can be assigned here only after classifying them, not by blanket provider-audio-* write access.

**Smaller scopes:** `E05.decoders` — Codec-family output and malformed streams; `E05.adaptation` — Precision, channels and conversion contracts; `E05.kernels` — Scalar/SIMD differential verification.

**Verification:** V1 + V3 → V2; V4 only after correctness. **Review with:** B04, C04, E03, H01, H02, H03.

#### E06 — Engine preparation, assets and runtime isolation

**Owns:** Engine preparation/loading, private-engine admission, isolated versus cooperative runtime choice and initialization ABI.

**Source anchors:** [`src/internal/engine-preparation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/engine-preparation.ts); [`src/internal/runtime-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/runtime-worker.ts); [`src/internal/private-playback-admission.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/private-playback-admission.ts); [`src/internal/remux-runtime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/remux-runtime.ts); [`src/internal/machine/engine-preparation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/engine-preparation.ts); [`src/internal/machine/private-engine-admission.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/private-engine-admission.ts); [`src/internal/machine/remux-deployment.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/remux-deployment.ts); [`src/internal/machine/resource-loader.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/resource-loader.ts); [`web/resource-loader.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/resource-loader.js); [`web/prepared-engine.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/prepared-engine.js); [`web/private-mpv.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv.js); [`web/private-mpv/engine.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/engine.js); [`native/player.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/player.c); [`native/events.c`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/native/events.c).

**Starting tests:** [`tests/engine-preparation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/engine-preparation.mjs); [`tests/resource-loader.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/resource-loader.mjs); [`tests/runtime-isolation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/runtime-isolation.mjs); [`tests/remux-profiles.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/remux-profiles.mjs); [`tests/api-stability/private-engine-policy.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/private-engine-policy.mjs); [`tests/api-stability/remux-deployment-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/remux-deployment-state.mjs).

**Invariant:** Only matching, available runtime assets are admitted. Isolation/JSPI/Asyncify selection cannot manufacture unsupported capabilities; initialization failure cleans up all partially acquired resources.

**Boundary:** B05 owns provider-level sharing/deployment; H01 builds runtime bytes and H02 packages them. Native ABI and worker initialization changes must be tested with rebuilt matching assets.

**Smaller scopes:** `E06.admission` — Runtime flavor and isolation constraints; `E06.loading` — Asset identity and preparation failure; `E06.abi` — Initialization, native events and compatibility.

**Verification:** V1 → V2 + V3 when runtime bytes change. **Review with:** A05, B05, D04, E01, H01, H02.

### F. Subtitles and previews

#### F01 — Subtitles, captions and overlays

**Owns:** Native/mpv subtitle service, browser captions, subtitle worker/timeline/presentation lifetime, fonts and bitmap/text output.

**Source anchors:** [`src/internal/native-mpv-subtitles.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/native-mpv-subtitles.ts); [`src/internal/plain-vtt.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/plain-vtt.ts); [`src/internal/machine/native-captions.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-captions.ts); [`src/internal/machine/native-subtitle-lifetime.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-subtitle-lifetime.ts); [`src/internal/machine/native-subtitle-presentation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-subtitle-presentation.ts); [`src/internal/machine/native-subtitle-timeline.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/native-subtitle-timeline.ts); [`src/internal/machine/subtitle-worker.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/subtitle-worker.ts); [`web/mpv-subtitle-worker.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/mpv-subtitle-worker.js); [`web/subtitle-overlay.js`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/web/subtitle-overlay.js); [`native/subtitles/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/native/subtitles/).

**Starting tests:** [`tests/subtitle-overlay.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/subtitle-overlay.mjs); [`tests/subtitle-deadline-race.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/subtitle-deadline-race.mjs); [`tests/api-stability/native-subtitle-timeline.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/native-subtitle-timeline.mjs); [`tests/api-stability/subtitle-worker-lifecycle.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/subtitle-worker-lifecycle.mjs); [`tests/subtitle-composition-browser.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/subtitle-composition-browser.mjs).

**Invariant:** Cue/bitmap/font work is scoped to the current attachment, source and timeline. Seek, delay, style change and removal cannot leave stale subtitles or unbounded polling.

**Boundary:** A04 owns attachment/selection policy. D01/D02 own backend integration hubs, E03 the audio clock, G04 track/style controls. Native service changes require H01 rebuild.

**Smaller scopes:** `F01.content` — Text, styled and bitmap fidelity; `F01.timeline` — Seek, delay, deadlines and cue boundaries; `F01.lifetime` — Fonts, worker and overlay retirement.

**Verification:** V1 → V2. **Review with:** A04, D01, D02, E03, H01.

#### F02 — Preview authority, controller and cache

**Owns:** Preview request/caller identity, cache admission/retention, foreground protection, cancellation and independent preview-session lifetime.

**Source anchors:** [`src/preview/controller.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/controller.ts); [`src/preview/player-preview.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/player-preview.ts); [`src/internal/preview-session.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/preview-session.ts); [`src/internal/machine/preview.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/preview.ts); [`src/internal/machine/preview-session.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/preview-session.ts).

**Starting tests:** [`tests/preview.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview.mjs); [`tests/preview-facade.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-facade.mjs); [`tests/preview-session.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-session.mjs); [`tests/api-stability/preview-core.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/preview-core.mjs); [`tests/api-stability/consumer-preview-acquisition.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/consumer-preview-acquisition.mjs).

**Invariant:** Preview work cannot mutate primary playback. Cache/accounting stay bounded, stale results are rejected, protected foreground entries remain protected and teardown settles callers/resources.

**Boundary:** F02 is the single writer for controller.ts and machine/preview.ts. F03 strategy and F04 provider tasks request integration here rather than independently editing these hubs. PR #6 already changes this area.

**Smaller scopes:** `F02.requests` — Caller identity, deduplication and cancellation; `F02.cache` — Admission, eviction and byte accounting; `F02.lifecycle` — Provider/session replacement and teardown.

**Verification:** V1 → V2. **Review with:** A05, E01, F03, F04, F05.

#### F03 — Preview pregeneration, strategies and sampling

**Owns:** On-demand/pregeneration strategies, sampling focus, bounded background scheduling and strategy changes.

**Source anchors:** [`src/preview/pregeneration.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/pregeneration.ts); [`src/preview/strategies.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/strategies.ts); [`src/preview/samplers.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/samplers.ts); [`src/internal/machine/preview-pregeneration.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/preview-pregeneration.ts); [`src/internal/machine/preview-demuxe.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/preview-demuxe.ts); [`src/internal/machine/preview-interaction.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/preview-interaction.ts).

**Starting tests:** [`tests/preview-pregeneration.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-pregeneration.mjs); [`tests/preview-strategies.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-strategies.mjs); [`tests/preview-range.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-range.mjs); [`tests/preview-options-browser.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-options-browser.mjs).

**Invariant:** Background scheduling yields to playback/foreground work and respects finite source/range budgets. Strategy changes stop obsolete jobs without discarding unrelated useful state.

**Boundary:** F02 owns cache/admission execution and shared controller edits. F03 can audit them, but a proposed scheduling improvement is not permission to weaken foreground protection or infer battery savings.

**Smaller scopes:** `F03.sampling` — Coverage, focus and valid sample times; `F03.scheduling` — Foreground priority and bounded background work; `F03.strategy` — Strategy replacement and custom input validation.

**Verification:** V1 → V2. **Review with:** F02, F04, F05, H03.

#### F04 — Preview providers, extraction and images

**Owns:** Provider capability decisions, independent frame extraction, approximate/exact semantics and preview image representation/cleanup.

**Source anchors:** [`src/preview/providers.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/providers.ts); [`src/preview/session-provider.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/session-provider.ts); [`src/preview/software.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/software.ts); [`src/preview/images.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/images.ts); [`src/internal/machine/preview-image.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/preview-image.ts).

**Starting tests:** [`tests/preview-images.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-images.mjs); [`tests/preview-facade.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-facade.mjs); [`tests/preview-software.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-software.mjs); [`tests/preview-shaka-browser.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-shaka-browser.mjs).

**Invariant:** A provider cannot label an approximate frame as exact or start unsupported work optimistically. Images and temporary decoder resources have explicit ownership and cleanup.

**Boundary:** F02 owns provider ordering/request orchestration; C03 metadata, E02 decoder behavior and F05 image consumption are separate. session-provider.ts is in the current PR #6 change set.

**Smaller scopes:** `F04.eligibility` — Provider eligibility and exactness; `F04.extraction` — Independent decode, seek and timestamps; `F04.images` — Image lifetime, crops and resource cleanup.

**Verification:** V1 → V2. **Review with:** A05, C03, E02, F02, F05.

#### F05 — Scrubber preview interaction

**Owns:** Hover/touch preview intent, buffering eligibility, pointer cancellation, stale display rejection and scrubber interaction state.

**Source anchors:** [`src/player/preview.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/preview.ts); [`src/internal/machine/scrubber.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/scrubber.ts).

**Starting tests:** [`tests/scrubber-preview.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/scrubber-preview.mjs); [`tests/api-stability/scrubber-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/scrubber-state.mjs); [`tests/preview-ui.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/preview-ui.mjs); [`tests/timeline-pointer.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/timeline-pointer.mjs).

**Invariant:** Displayed previews match current pointer/source intent. Leaving, cancelling, replacing or destroying clears stale intent; previewing does not accidentally seek primary playback.

**Boundary:** G02 owns keyboard/timeline control intent, A03 seek semantics, G01 the component root and F02 request lifetime. Current PR #6 touches these files; review/qualify that work first.

**Smaller scopes:** `F05.hover` — Stationary hover and eligibility changes; `F05.touch` — Touch drag and pointer cancellation; `F05.display` — Source changes and stale thumbnail suppression.

**Verification:** V1 → V2. **Review with:** A03, F02, F04, G01, G02, G03.

### G. Player UI and application integrations

#### G01 — Player component lifecycle and queue

**Owns:** The player web-component root, connect/disconnect/configuration lifecycle, queue behavior and integration wiring.

**Source anchors:** [`src/player/index.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/index.ts); [`src/internal/machine/element-lifecycle.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/element-lifecycle.ts); [`src/internal/machine/element-queue.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/element-queue.ts); [`src/internal/machine/element-configuration.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/element-configuration.ts).

**Starting tests:** [`tests/player-component.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-component.mjs); [`tests/api-stability/element-lifecycle-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/element-lifecycle-state.mjs); [`tests/api-stability/element-queue-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/element-queue-state.mjs); [`tests/api-stability/element-configuration-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/element-configuration-state.mjs).

**Invariant:** Queue and component lifetime track the accepted Player. Reconnection or rapid replacement cannot duplicate observers, create orphan players or attach controls to retired media.

**Boundary:** Single writer for src/player/index.ts. G02/G04/F05 can propose integration changes, not write separate regions at once. API behavior remains A01–A04 responsibility. PR #6 is in-flight here.

**Smaller scopes:** `G01.lifecycle` — Connect, disconnect and reconnect; `G01.queue` — Ordered queue and source replacement; `G01.wiring` — Component composition and configuration.

**Verification:** V1 → V2. **Review with:** A02, F05, G02, G03, G04.

#### G02 — Controls, shortcuts and timeline navigation

**Owns:** Input-to-control mapping, keyboard/pointer action interpretation and timeline navigation/view state.

**Source anchors:** [`src/player/interaction.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/interaction.ts); [`src/internal/machine/element-controls.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/element-controls.ts); [`src/internal/machine/element-view.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/element-view.ts).

**Starting tests:** [`tests/player-seek-target.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-seek-target.mjs); [`tests/playground-shortcuts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/playground-shortcuts.mjs); [`tests/api-stability/element-controls-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/element-controls-state.mjs); [`tests/timeline-pointer.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/timeline-pointer.mjs); [`tests/player-component.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-component.mjs).

**Invariant:** Numeric shortcuts, Home/End, dragging and displayed bounds use the same active range contract. Editable controls and cancelled gestures must not issue unintended playback actions.

**Boundary:** A03 defines seek/boundary semantics; F05 owns thumbnail intent; G01 integrates root event handlers. No parallel edits to index.ts; current excerpt work is already in PR #6.

**Smaller scopes:** `G02.shortcuts` — Keyboard mapping and focus safety; `G02.navigation` — Range-aware seek targets and clearing ranges; `G02.controls` — Pointer action and visual-state consistency.

**Verification:** V1 → V2. **Review with:** A03, F05, G01, G03.

#### G03 — Layout, presentation modes and accessibility

**Owns:** DOM layout, viewport/fullscreen/PiP behavior, mobile interaction surfaces, themes and accessible controls.

**Source anchors:** [`src/presentation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/presentation.ts); [`src/player/presentation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/presentation.ts); [`src/player/mobile.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/mobile.ts); [`src/player/viewport.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/viewport.ts); [`src/player/styles.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/styles.ts); [`src/player/themes.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/themes.ts); [`src/player/icons.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/icons.ts); [`src/internal/machine/presentation.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/presentation.ts); [`src/internal/machine/viewport-lease.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/viewport-lease.ts).

**Starting tests:** [`tests/player-presentation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-presentation.mjs); [`tests/player-mobile.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-mobile.mjs); [`tests/integration-presentation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/integration-presentation.mjs); [`tests/api-stability/presentation-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/presentation-state.mjs); [`tests/player-component.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-component.mjs).

**Invariant:** Presentation changes preserve playback ownership and operable controls. Focus, keyboard access and touch geometry remain usable; hidden/visible/PiP transitions do not orphan surfaces.

**Boundary:** E04 owns decoded video pixels and GPU resources. G01 owns component wiring. Audit accessibility beyond current tests; an existing browser test name does not establish complete accessibility coverage.

**Smaller scopes:** `G03.modes` — Fullscreen, PiP and viewport lifetime; `G03.responsive` — Mobile geometry and theme/layout behavior; `G03.accessibility` — Focus, naming and keyboard/touch accessibility.

**Verification:** V1 → V2. **Review with:** E04, F05, G01, G02, G05.

#### G04 — Advanced settings and component controls

**Owns:** Settings menus, reusable control rendering and feedback for tracks, effects and advanced playback options.

**Source anchors:** [`src/player/advanced-settings.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/advanced-settings.ts); [`src/player/components.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player/components.ts).

**Starting tests:** [`tests/api-stability/advanced-settings.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/advanced-settings.mjs); [`tests/api-stability/advanced-playback.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/advanced-playback.mjs); [`tests/player-component.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/player-component.mjs).

**Invariant:** UI distinguishes pending, accepted, rejected and unavailable settings. A failed transaction cannot leave the menu claiming a configuration the player never applied.

**Boundary:** A04 owns semantic policy and machine/advanced-controls.ts; G04 owns rendering/interaction. Root integration changes go through G01 and new public controls through A01.

**Smaller scopes:** `G04.menus` — Track and advanced-option interaction; `G04.feedback` — Pending/rejected/accepted state; `G04.consistency` — Reopen, replacement and control synchronization.

**Verification:** V1 → V2. **Review with:** A01, A04, F01, G01.

#### G05 — Application bindings and media adapters

**Owns:** Application integration API, media-element bridge and Video.js adapter behavior and lifetime.

**Source anchors:** [`src/integration/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/integration/); [`src/media-element/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/media-element/); [`src/adapters/videojs.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/adapters/videojs.ts); [`src/internal/machine/bindings.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/bindings.ts); [`src/internal/machine/videojs.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/videojs.ts).

**Starting tests:** [`tests/integration.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/integration.mjs); [`tests/integration-types.ts`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/integration-types.ts); [`tests/api-stability/binding-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/binding-state.mjs); [`tests/api-stability/videojs-state.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/videojs-state.mjs); [`tests/integration-browser.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/integration-browser.mjs).

**Invariant:** Adapters preserve the intended public playback contract and dispose listeners/resources correctly. Consumer-facing promises, events and state cannot disagree across wrappers.

**Boundary:** A01 owns shared public contracts, G03 presentation and H02 package entrypoints. Expand directory anchors to exact files before assigning writes; examples are explicit task additions, not blanket scope.

**Smaller scopes:** `G05.bindings` — Application subscriptions and ownership; `G05.media` — Media-element contract behavior; `G05.videojs` — Video.js adaptation and lifecycle.

**Verification:** V1 → V2. **Review with:** A01, A02, G03, H02.

### H. Build, delivery and project assurance

#### H01 — Native builds, toolchains and upstream patches

**Owns:** Reproducible engine builds, pinned sources/toolchains, patch application, build portability and native artifact provenance.

**Source anchors:** [`scripts/build.sh`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/build.sh); [`scripts/link.sh`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/link.sh); [`scripts/link-hybrid.sh`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/link-hybrid.sh); [`scripts/build-remux.sh`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/build-remux.sh); [`scripts/build-subtitles.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/build-subtitles.py); [`scripts/build-software-yuv.sh`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/build-software-yuv.sh); [`scripts/build-components.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/build-components.mjs); [`sources.lock.json`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/sources.lock.json); [`toolchain.lock.json`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/toolchain.lock.json); [`Dockerfile`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/Dockerfile); [`patches/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/patches/).

**Starting tests:** [`tests/build-recipe-portability.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/build-recipe-portability.py); [`tests/provider-audio-builds.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-audio-builds.mjs); [`tests/runtime-isolation.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/runtime-isolation.mjs).

**Invariant:** A runtime artifact can be traced to its source, toolchain, build flags and patches. Build success alone is not decoder correctness or browser/runtime qualification.

**Boundary:** Feature owners own native code; H01 owns its build path. Dependency/ABI or patch-content changes require the corresponding feature owner and H04 provenance review. Build outputs must be isolated.

**Smaller scopes:** `H01.reproduction` — Source/toolchain pins and build determinism; `H01.patches` — Patch applicability, provenance and portability; `H01.artifacts` — Artifact identity and rebuild dependencies.

**Verification:** V1 + V3; downstream V2 required. **Review with:** C04, E02, E05, E06, H02, H04.

#### H02 — Packages, bundler, CLI and deployment

**Owns:** Package manifests, exports and lockfiles, bundling/delivery, CLI, deployment workflows and generated-output production.

**Source anchors:** [`packages/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/packages/); [`bin/demuxe.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/bin/demuxe.mjs); [`package.json`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/package.json); [`package-lock.json`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/package-lock.json); [`tsconfig.json`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tsconfig.json); [`scripts/package-beta.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/package-beta.py); [`scripts/package-core.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/package-core.py); [`scripts/copy-shaka-assets.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/copy-shaka-assets.mjs); [`hosting/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/hosting/); [`.github/workflows/bundler.yml`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/.github/workflows/bundler.yml); [`.github/workflows/modular-release.yml`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/.github/workflows/modular-release.yml); [`.github/workflows/pages.yml`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/.github/workflows/pages.yml).

**Starting tests:** [`tests/beta-consumer.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/beta-consumer.mjs); [`tests/asset-deployment.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/asset-deployment.mjs); [`tests/asset-deployment-browser.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/asset-deployment-browser.mjs); [`tests/provider-conformance-installed.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-conformance-installed.mjs); [`tests/shaka-package.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-package.mjs); [`tests/shaka-optional-build.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/shaka-optional-build.mjs).

**Invariant:** Installed consumers receive the declared imports and matching verified assets in each supported delivery mode. A working checkout is not evidence that an npm/archive consumer works.

**Boundary:** packages/ is an inventory anchor, not exclusive ownership of all implementation code. H02 owns packaging metadata and bundler/CLI logic; delegate provider implementations to feature owners using exact files. Never hand-edit generated output.

**Smaller scopes:** `H02.consumer` — Exports, dependency closure and installed consumers; `H02.delivery` — Asset versus embedded bundles and optional providers; `H02.deployment` — CLI, hosting, manifests and release assembly.

**Verification:** V1 + V3 → installed-consumer V2. **Review with:** A01, B04, B05, D02, E06, H01, H04.

#### H03 — Verification infrastructure and evidence

**Owns:** Test harnesses/suite registry, fault servers, fixture identity, repeatable browser qualification and benchmark methodology; evidence archiving.

**Source anchors:** [`tests/api-stability/run.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/run.mjs); [`tests/api-stability/suites.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/suites.mjs); [`tests/head-to-head/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/tests/head-to-head/); [`tests/provider-conformance/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-conformance/); [`fixtures/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/fixtures/); [`scripts/compatibility-fixtures.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/compatibility-fixtures.py); [`.github/workflows/api-contracts.yml`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/.github/workflows/api-contracts.yml); [`.github/workflows/provider-conformance.yml`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/.github/workflows/provider-conformance.yml); [`.github/workflows/streaming-recovery.yml`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/.github/workflows/streaming-recovery.yml).

**Starting tests:** [`tests/provider-conformance-installed.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/provider-conformance-installed.mjs); [`tests/head-to-head/contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/head-to-head/contracts.mjs); [`tests/api-stability/live-check-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/live-check-contracts.mjs); [`tests/api-stability/live-fault-server-contracts.mjs`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/live-fault-server-contracts.mjs).

**Invariant:** A passing gate means the intended assertions ran against the identified build and real output where required. Missing cases, skipped checks and stale reports cannot become passes.

**Boundary:** H03 does not own all feature tests or all production fixes. Feature owners author regressions; H03 reviews runner/oracle changes. Historical results are immutable, new evidence goes to unique run directories.

**Smaller scopes:** `H03.harness` — Coverage membership, supervision and false-pass prevention; `H03.fixtures` — Fixtures, fault injection and reproducibility; `H03.evidence` — Browser/artifact identity and performance protocol.

**Verification:** V1 → relevant V2/V3; exclusive V4. **Review with:** A06, H01, H02, H04.

#### H04 — Documentation, licensing and policy coherence

**Owns:** Contribution/testing documentation, license boundaries and notices, preserved provenance, and cross-domain security review standards.

**Source anchors:** [`CONTRIBUTING.md`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/CONTRIBUTING.md); [`LICENSING.md`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/LICENSING.md); [`licensing/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/licensing/); [`LICENSES/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/LICENSES/); [`scripts/check-licenses.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/scripts/check-licenses.py); [`tests/licenses.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/licenses.py); [`docs/TESTING-STANDARD.md`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/docs/TESTING-STANDARD.md); [`docs/BENCHMARK-PROTOCOL.md`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/docs/BENCHMARK-PROTOCOL.md); [`third_party/`](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/third_party/).

**Starting tests:** [`tests/licenses.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/licenses.py); [`tests/build-recipe-portability.py`](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/build-recipe-portability.py).

**Invariant:** Documentation and package claims match qualified behavior and authoritative provenance. Tests/hashes/licenses are not altered merely to make a change pass, and agents cannot grant rights they do not hold.

**Boundary:** Feature documentation remains the relevant component's responsibility. H04 coordinates policy and provenance, not unilateral relicensing or blanket third-party edits. Human approval is required for legal/licensing decisions.

**Smaller scopes:** `H04.coherence` — Documentation versus actual contracts and qualification; `H04.provenance` — License boundaries, notices and preserved hashes; `H04.security` — Review rules for untrusted media, URLs and dependencies.

**Verification:** V0/V1; affected packaging checks when changed. **Review with:** A01, C02, C03, H01, H02, H03.

## 5. Agent counts and operating modes

### 5.1 Recommended full ownership map: 44 roles

| Roles | Count | Normal job |
|---|---:|---|
| Component owners A01–H04 | 40 | Audit, reproduce, implement bounded changes and supply regression evidence within an assigned scope. |
| S01: coordinator/scheduler | 1 | Maintain backlog, check in-flight work, choose non-conflicting tasks, grant/revoke leases and allocate runners. |
| S02: integration/contracts reviewer | 1 | Review shared schemas, cross-component invariants and candidate integrations. Editing requires delegated ownership and a lease. |
| S03: independent deterministic/adversarial verifier | 1 | Reproduce claimed fixes, challenge assumptions/oracles, exercise event interleavings and review regressions. |
| S04: independent browser/artifact verifier | 1 | Check actual browser output, lifecycle cleanup and installed-package/runtime identity on appropriate hosts. |
| **Total** | **44** | A capacity map, not 44 always-running writers. |

The eight parents are organizing/assignment nodes, **not eight additional mandatory supervisor agents**. S02 does not bypass A02/G01/etc. by editing their hubs independently. H03 can author test harness work, but another role verifies that work; no agent approves a patch it authored just because it now has a “verifier” title.

An independent review should consume the patch, baseline, reproduction and raw evidence, rather than merely repeat the author's summary. Independence improves the workflow but is not a guarantee against correlated mistakes. Use different tests/oracles and a clean verification workspace where it matters.

### 5.2 A sensible 20-agent allocation

Use 16 broader work scopes and the same four support roles. Each row below contributes two workers; none of these grouped scopes may coexist as a writer with its individual leaf owners.

| Parent | Broad worker 1 | Broad worker 2 |
|---|---|---|
| A | A01–A03: API, composition, transport | A04–A06: settings, resources, observations |
| B | B01–B03: evidence, admission, recovery | B04–B05: provider choice and acquisition |
| C | C01–C03: source bytes and inspection | C04–C05: remux production and consumption |
| D | D01 + D04: native/Wasm backend lifetimes | D02–D03: Shaka and network recovery |
| E | E01 + E02 + E06: execution and decode runtime | E03–E05: audio, presentation and codecs |
| F | F01: captions/subtitles | F02–F05: preview subsystem |
| G | G01–G03: player, navigation and presentation | G04–G05: settings UI and integrations |
| H | H01–H02: builds and delivery | H03–H04: test infrastructure and governance |

This balances cohesive responsibility, not equal file counts or equal effort. Idle workers should help reproduce or verify another scoped task, not manufacture changes to fill quotas.

### 5.3 A 50-agent campaign

Keep the 44-role ownership map and add six temporary **read-only/test-focused sweeps**: malformed-media/parser differential tests; cancellation/reentrancy interleavings; asset/deployment mismatch tests; teardown/leak/long-play sequences; accessibility/mobile interaction review; and performance-experiment design/independent reproduction.

Their findings route back to existing owners. These are not new authorities to edit every file touched by the sweep. The performance sweep shares the same exclusive benchmark-host allocation; six analysts do not justify six simultaneous benchmark arms on one machine.

### 5.4 Concurrency control

Start with four writing tasks, selected by **conflict and coupling**, not just different parent letters. For example, a local reader validation task, a subtitle-timeline regression, an isolated UI style issue and a package-consumer test may be separable after exact paths and contracts are checked. A source-lifecycle fix and a transport fix are often not separable even when their main files differ.

Track the actual bottleneck: review queue, merge conflicts, reruns, flaky tests, unresolved cross-domain contracts or browser/native build capacity. Raise the writing limit incrementally only when those remain manageable. A later 8–12 writer limit is a possible experiment, not a capacity claim for this repository or the user's hardware.

## 6. Shared files, contracts and write leases

### 6.1 Explicit shared integration ownership

| Shared surface | Primary integration owner | Required review when affected |
|---|---|---|
| `src/unified-player.ts` | A02 | Relevant source/routing/backend/preview owners; S02 for cross-domain behavior. |
| `machine/transition.ts`, `machine/state.ts` | A02 | Every modified substate owner and A05 for retirement/effect semantics. |
| `src/types.ts`, public export shims, `internal/backend.ts` | A01 | Producers, consumers and H02 for package compatibility. |
| `machine/protocol.ts`, generic resource/effect machinery | A05 | Both message/effect producer and consumer; A02 for composition. |
| `src/internal/native-player.ts` | D01 | Audio, subtitles and remux owners for their integration paths. |
| `src/internal/shaka-backend.ts` | D02 | D03 plus track/subtitle/API owners as applicable. |
| `src/preview/controller.ts`, `machine/preview.ts` | F02 | F03/F04/F05 when their contracts change. |
| `src/player/index.ts` | G01 | G02/G04/F05 and A03 for navigation semantics. |
| Root package/lock/config, packaging manifests and bundler closure | H02 | A01, B05 and relevant provider owners. |
| Suite registry and shared test runner | H03 | Affected domain plus independent verifier. |
| Source/toolchain locks and build/patch orchestration | H01 | Native/provider owner and H04 for provenance. |
| License boundary manifests and preserved notices | H04 | Relevant owner and authorized human review. |

`machine/` in this table abbreviates `src/internal/machine/`. These are designated review/integration owners, not evidence that all current integrations have already been extracted or enforced.

Other exact-file overlaps are discovered during task planning. The absence of a file in this table is not permission for multiple writers. Cross-file semantic changes can conflict even without a textual overlap.

### 6.2 Lease protocol

Before granting writes, the coordinator records: task ID; owner and scope; baseline commit; exact allowed paths including intended additions/deletions; relevant shared contracts; current branch/head; lease identity/generation; expiration/heartbeat policy; test/build output destinations; and approved runner resources.

One active writer may hold a given file or shared contract lease. Parent/child leases cannot overlap. An expired lease is not automatically safe to reuse while the old process is still running: revoke its execution/write capability or reject its outputs using a newer lease generation. The integration service must reject patches from stale generations.

Agents can request a scope expansion. Approval updates the task and lease **before** additional edits. Unmapped files fail closed and go to S01/S02 for ownership classification. New files need a primary owner, affected-contract review and test mapping; they do not inherit unlimited rights from a similarly named directory.

A real scope checker should examine added, modified, deleted, renamed and mode-changed files, checking both sides of a rename and resolving paths safely. Do not rely on shell globs alone, or allow a symlink/path traversal to escape the workspace. The final merged diff must still match the approved task; exact path compliance is necessary but not sufficient semantic review.

### 6.3 CODEOWNERS is not a scheduler

GitHub CODEOWNERS can route review and, with appropriate branch settings, make code-owner review required. It is not a file lock, an agent sandbox, or a guarantee that concurrent patches compose. Generate a review map only after real GitHub users/teams are selected; do not invent handles. The task lease, diff checker and independent merge gate remain separate. No existing branch-protection configuration was verified or changed for this plan. [E2]

### 6.4 Isolate more than the working tree

Use a separate branch/worktree or equivalent isolated checkout per writing task and a clean verification workspace. Git worktrees provide separate working trees attached to a repository, but share repository metadata; do not let agents reset or rebase someone else's branch. [E1]

Also isolate mutable build outputs, generated JavaScript/declarations, runtime extraction directories, temporary files, fixture-server ports, browser profiles, result directories and native build trees. Shared caches are acceptable only when their implementation supports concurrent use and keys include the necessary source/toolchain/options. An immutable artifact cache is safer than sharing a writable `web/generated/` or engine build directory.

Limit credentials by role. Audit/test workers do not need production secrets, release signing credentials or broad repository administration. Publishing, changing settings and merging require a separate authorized action. Treat media fixtures, PR text, third-party sources and generated reports as input—not instructions that can expand an agent's authority.

## 7. Cross-domain invariants and boundary tests

A file map must be accompanied by an **invariant map**. These are proposed assertions to check against the current implementation, not newly confirmed defects.

| Invariant | Primary driver | Mandatory neighboring evidence |
|---|---|---|
| Source/session/operation authority is current everywhere. | A02 | Late probe, worker, subtitle, preview and network completion after replacement is rejected. |
| Pause and latest-seek intent survive backend changes. | A03 | Delayed native/Wasm confirmation, fallback, queue changes and cancellation cannot resume stale intent. |
| Every physical resource is eventually released by its proper owner. | A05 | Worker tree, VideoFrame, Blob URL, port, GPU surface, listener and audio resources after success/failure/cancellation. |
| Routing claims only the currently justified capability. | B01/B02 | Fast inspector decline, failed native startup, provider refresh and asset mismatch all invalidate the appropriate evidence. |
| Provider composition preserves output requirements. | B04 | Precision/channels/subtitles/filter requirements survive fallback and lower-cost selection. |
| Media bytes belong to one representation. | C02 | ETag/length/auth changes, partial requests and concurrent reads do not splice sources. |
| EOF/replay means fresh media output, not stale counters. | C05/D02 | Append drain, replay frame evidence, audio completion and seek-after-EOF behavior. |
| Worker/decoder epochs and ownership are consistent. | E01/E02 | Delayed messages, transferred buffers/frames, reset, flush and teardown sequences. |
| Audio/video/subtitle timing uses compatible units and origins. | E03 | Seeks, rate/delay changes, timestamp discontinuities and subtitle boundaries across providers. |
| Preview work never changes primary playback. | F02 | Providers, background sampling, hover/touch interaction and disposal remain independent. |
| Controls and preview geometry share the active timeline contract. | G02 | A03 bounds, F05 gestures, source/range clearing and queue replacement. |
| Published evidence identifies exactly the delivered implementation. | H02/H03 | Commit, manifest, runtime/archive, fixture and browser identities; installed consumer rather than stale checkout output. |

For each boundary, maintain both a deterministic contract test and a real integration scenario where physical effects matter. Useful adversarial dimensions include event order, failure timing, cancellation after acquisition, repeated close/destroy, source A → B → A, late authorization refresh, provider updates and EOF → replay → seek.

Use pairwise/targeted combinations plus explicitly high-risk interactions rather than claiming exhaustive coverage of every browser × codec × container × provider × output mode × user action. A component-level proof or test does not automatically prove the browser/native composition.

## 8. Continuous-improvement workflow

### 8.1 Select meaningful work

Maintain one deduplicated backlog with component IDs, affected contracts, evidence status and priority. Distinguish **reproduced defect**, **static-only finding**, **qualification gap**, **performance hypothesis**, **maintainability proposal** and **not an issue**. Do not label an unexecuted test or plausible race a reproduced bug.

Prioritize correctness failures, security/resource-exhaustion issues and user-visible regressions before speculative optimization or cosmetic restructuring. For optimization, state the suspected cost, expected observable outcome, correctness constraints and measurement method. CPU, memory, startup, output fidelity and code complexity are different objectives; one must not be silently traded for another.

Trigger audits from relevant changes, dependency/runtime updates, failed qualification, reported behavior or a deliberate coverage rotation. Avoid endless time-based rewrites of healthy code and quotas based on number of commits or issues filed.

### 8.2 Bounded task lifecycle

1. **Discover and deduplicate.** Read current code, exact baseline, open PRs/issues, domain contract and nearby tests. Reserve paths/contracts and check predecessor work.
2. **Reproduce or characterize.** Reduce the problem, record baseline behavior, classify confidence and identify the test oracle. For pure race logic, capture a replayable event sequence and seed.
3. **Propose the smallest justified change.** Declare non-goals, semantic impact, intended paths and neighboring owners. Obtain shared-file/contract approval before editing.
4. **Implement and self-review.** Keep commits focused; review the complete diff after each meaningful step. Add a regression, preserve unrelated behavior and avoid opportunistic refactoring.
5. **Verify independently.** Reproduce the baseline failure and candidate success where applicable; check the oracle, exact build/assets and cleanup. Author and verifier cannot jointly waive a failed gate.
6. **Integrate and revalidate.** Rebase/merge into a fresh candidate, resolve conflicts through the owning domain, rebuild affected outputs and rerun impacted suites. A prior branch result does not certify the integrated tree.
7. **Close and follow through.** Record the final commit, evidence, remaining limits, rollback and any narrower follow-up. Recheck the merged/delivered artifact where appropriate.

Stop when the scoped acceptance criteria are met, when no issue is found with adequate evidence, or when a concrete blocker/required handoff is documented. “No change warranted” is a successful audit outcome. Do not leave a perpetual “improve the subsystem” writer running without bounded objectives.

### 8.3 In-flight reservation: PR #6

At review time, **PR #6** is an open draft titled “Fix excerpt navigation, preview admission, touch thumbnails, and replay evidence,” with head `8a0d8f674ac262667055df5dd5dd76327669a666`. It changes the following paths. Refresh the PR state/head before assigning any task; this reservation is a snapshot, not a permanent lock. [R14]

```text
src/internal/machine/preview.ts
src/internal/machine/scrubber.ts
src/player/index.ts
src/player/interaction.ts
src/player/preview.ts
src/preview/controller.ts
src/preview/session-provider.ts
tests/excerpt-preview-contracts.mjs
tests/player-navigation-preview.mjs
tests/shaka-lifecycle.mjs
```

Route this initially to **F02/F04/F05/G01/G02 with D02 replay review and S04 verification**, rather than launching duplicate fixes. The PR body reports focused checks but explicitly lists full-build, actual-player and Shaka end-to-end work still outstanding. Those are author-reported limits, not results independently reproduced by this review. The two new test files in this change list are PR paths, not baseline-main test anchors. [R14]

### 8.4 Worked example: one issue across several owners

Suppose a hover preview is stale after a source switch. F05 owns the displayed intent; F02 owns request identity and cancellation; F04 owns the provider response; A02 owns source lifecycle. Start with **one primary driver** selected after reproducing where authority first fails.

The reproduction should switch source during a delayed preview request and observe both the displayed image and the underlying playback state. A provider mock can verify stale-result rejection; a browser scenario verifies actual UI teardown and that playback was not sought accidentally. A change to F02's controller is leased to F02 even when the investigation began in F05. A change to the component root is integrated by G01. The verifier tests the composed scenario, not just four separate green unit tests.

For the cache work already in PR #6, the analogous first task is **review and qualification of the existing change**. A reduction in provider-call counts is evidence of avoided work under that setup; it does not by itself establish measured CPU or battery savings.

## 9. Verification lanes and acceptance evidence

The lane identifiers here describe **verification**, not scope depth. They do not impose a mandatory expensive campaign on every edit.

| Lane | Purpose | Evidence and prerequisites |
|---|---|---|
| V0 | Structural/documentation review | Correct paths, coherent ownership, supported claims, link/manifest validation; no fabricated build or playback result. |
| V1 | Deterministic correctness | Type/build checks, unit/contract/property or replay tests, oracle inspection, negative cases and regression evidence. |
| V2 | Real browser correctness | Correct runtime assets, actual output/progression, cancellation/seek/lifecycle/cleanup, relevant browser/device constraints. |
| V3 | Native/artifact/installed qualification | Rebuilt matching native assets, manifests/hashes, ABI checks and installed consumers for affected delivery modes. |
| V4 | Performance/resource experiment | Correctness first, dedicated uncontended host, repository benchmark protocol, raw data and uncertainty. |

The verification lane on a card indicates likely needs. Choose the actual checks based on the patch and its dependency/asset closure, not by mechanically running every listed lane for every task.

### 9.1 Common commands from the inspected repository

Run commands in an isolated checkout after reviewing local prerequisites:

```bash
npm ci
npm run build
npm run check:licenses
npm run test:licenses
npm run test:stability
```

`npm run build` compiles TypeScript and runs the generated-license stamping step. Do not manually “fix” a committed generated file instead of editing its source. Confirm which outputs the packaging policy expects to be committed and regenerate through that policy. [R9, R12]

The deterministic stability runner also checks consumer types. For fast iteration, an agent can run the relevant individual test files after building. A focused subset is development feedback, **not a replacement for the required integration gate**. Tests listed in a card can include browser or build-dependent scripts; do not blindly feed every filename to `node --test`. [R9, R10, R10a]

For real browser gates, use an **actual matching packaged runtime** and the required group, for example:

```bash
# Replace this example path with a verified archive produced for the candidate.
BETA_ARCHIVE=/absolute/path/to/matching-runtime-archive \
  node tests/api-stability/run.mjs browser preview
```

Alternatively the existing runner accepts `DEMUXE_RUNTIME_ROOT` with the required bundle manifest/inventory and verifies the served bytes. Follow its current contract. The suite registry includes `core`, `ui`, `integration`, `preview`, `sequences` and `streaming`; bundle qualification has a separate handling path. The runner rejects an externally supplied `ONLY` selection for the gate. Do not bypass these protections to get a faster green check. [R10, R10a]

Existing feature-oriented scripts include `test:preview`, `test:shaka`, `test:integration`, `test:browser-capabilities`, `test:track-policy`, `test:remux-negotiation`, `test:runtime-isolation`, `test:provider-harness` and `test:asset-deployment`. Inspect their actual prerequisites; some prepare assets or invoke multiple browser stages. A documentation-only change does not automatically require every native/browser suite. [R9]

### 9.2 Match evidence to the changed layer

A pure decision fix needs adversarial sequences and relevant boundary regression tests. An imperative browser/worker fix needs observed physical behavior in addition to mocks. A native or ABI change needs rebuilt matching runtime bytes before browser results count. A package/export/layout change needs an installed consumer. A performance claim needs a separate valid experiment, not incidental timings from correctness tests.

Record unsupported platforms and unrun combinations explicitly. A headless test is not automatically representative of physical touch, hardware decoding, PiP, browser throttling or device-specific audio behavior. Escalate only the relevant matrix cells; do not claim universal qualification from one platform.

### 9.3 Per-task evidence record

A task result must include:

```text
Task and scope IDs; owner and independent verifier
Baseline SHA; candidate SHA; integrated/final SHA when available
Claim classification and confidence
Reproduction steps; failing baseline or justified characterization
Changed paths and reviewed cross-domain contracts
Exact commands, exit codes, assertion/case counts and raw logs
Runtime/archive/manifest/source identities and toolchain flags when relevant
Fixture hashes; browser/version/platform/flags; server/profile configuration
Observable output/progression and cleanup/resource results
Performance protocol, host contention and raw samples when relevant
Passed / failed / skipped / not-run items, each stated separately
Remaining risk; rollback path; concrete follow-up or closure reason
```

Keep the evidence immutable and namespaced to a unique task/run. Do not overwrite a historical report or update a golden/baseline hash merely to make a mismatch disappear. A verifier changing the expected output must explain the independent oracle and get the proper review. [R11–R12]

### 9.4 Scheduling runners

Reading/planning can be highly parallel. Lightweight deterministic tests can run within the host's resource budget. Browser correctness tests need bounded concurrency and independent ports/profiles; timing-sensitive checks may need an uncontended host. Native builds need separate build directories and memory-aware scheduling. Performance campaigns get an **exclusive benchmark-host lease**, with no competing builds or unrelated benchmark arms. [R11]

Measure startup latency and steady-state CPU separately. For the repository's macOS Chrome steady-state protocol, use the prescribed startup-completion evidence rather than substituting a quiet interval or a lower CPU sample. Preserve rejected windows and reasons. No optimization should be accepted solely because its author found a favorable run. [R11]

## 10. Incremental rollout

### Stage 1 — Establish the map and a baseline

Adopt the hierarchy as documentation; choose the coordinator and independent verification roles. Resolve the navigation seed against a complete fresh tracked-file inventory, expanding directory anchors and classifying currently unmapped source, tests, scripts and experiments. Confirm current open work, including PR #6. Record the actual status of the existing deterministic/browser/artifact gates rather than assuming a clean baseline.

Repository placement proposed by this documentation PR:

```text
docs/agents/HIERARCHY.md        # this operating guide
docs/agents/domains.json       # reviewed map; seed supplied separately
docs/agents/TASK-TEMPLATE.md   # bounded assignment and result contract
```

Add a short root agent-instructions entry pointing to these documents when implementing the workflow. Keep one canonical source of truth for scope ownership; do not maintain contradictory independent copies in prompts, CODEOWNERS and a scheduler.

### Stage 2 — Pilot four bounded changes

Choose four concrete, non-conflicting tasks only after confirming ownership and baseline behavior. Include at least one audit that can legitimately end with no change and one qualification task for existing in-flight work. This tests whether the process rewards useful evidence rather than patch volume.

Evaluate task completeness, path/contract collisions, independent reproduction and integration reruns. Fix the process first when the pilot reveals missing assets, ambiguous scope or flaky infrastructure. Do not use dozens of writers to conceal an unreliable test gate.

### Stage 3 — Add executable guardrails

Implement a scope resolver/diff checker, a lease-aware task registry, fresh candidate integration checks and evidence validation. Ensure renames, generated artifacts and unowned files fail safely. Configure appropriate repository review/check requirements only through an explicitly authorized settings change.

Preserve the distinction between authoring a regression and altering the acceptance gate. Agent-authored tests need oracle review; a PR cannot quietly remove suite membership, reduce minimum cases or disable a guard to make its own change pass.

### Stage 4 — Expand audits and adapt concurrency

Activate more leaf audits using the 20- or 44-role map. Increase concurrent writes only when the pilot's review capacity and runner capacity support them. Additional workers can create minimal reproductions, investigate unqualified combinations and independently review without increasing production write pressure.

Maintain measures that reflect value: verified regressions fixed, reduced escaped defects, smaller reproducible failures, qualification coverage tied to artifact identity, bounded resource behavior and reduced repeat conflicts. Count raw commits/lines/issues only as activity, not success.

### Stage 5 — Extract only demonstrated hotspots

When several tasks repeatedly require the same hub, consider small behavior-preserving extractions: source-session plumbing from `unified-player.ts`; input/navigation binding from `src/player/index.ts`; preview cache/admission from its controller/machine pair; or service attachment plumbing from `native-player.ts`. These are **candidate seams to evaluate**, not blanket recommendations or claims that existing code is defective.

First characterize behavior; then move code without intentional semantic changes; then verify and merge that extraction; only afterward grant independent implementation scopes. Do not combine broad movement with a difficult race fix, and do not replace the existing functional-core approach merely to match an agent organization chart.

## 11. Initial audit queue: review priorities, not new defects

| Work item | Suggested driver | Why start here | Required result |
|---|---|---|---|
| Finish independent qualification of existing PR #6. | F02 with G01/D02 and S04 | Avoid duplicate patches and address the PR's explicit evidence gaps. | Fresh build and relevant preview/UI/Shaka evidence, with platform limits. |
| Cross-domain source replacement/cancellation sequences. | A02 with A05 | These cross the central composition and many physical resources. | Replayable sequences plus physical cleanup where relevant; no unsupported defect claim. |
| Runtime/archive mismatch and installed consumer checks. | H02 with B05/E06 | Many logical providers ultimately depend on exact delivered bytes. | Clearly rejected mismatches and working identified consumer artifacts. |
| Worker/frame/PCM ownership under seek, EOF and destroy. | E01 with E02/E03 | Local state and actual resources must stay consistent. | Bounded counters/queues, output and teardown evidence. |
| Fast-inspector decline, metadata budgets and source identity. | C03 with C02/B01 | Routing depends on correctly scoped, justified media facts. | Malformed/unsupported fixtures and fallback/identity assertions. |
| Contribution/license documentation coherence. | H04 with H02 | Inspected contributing text and package metadata describe boundaries differently. | Reconcile authoritative manifests, source headers and docs through proper review—not automatic relicensing. |

The last item is a consistency-review task: `CONTRIBUTING.md` discusses GPL player/integration contributions, whereas inspected package metadata labels original application runtime Apache-2.0 and the inspected Player source has an Apache header. That difference warrants checking the authoritative boundary manifest and project intent; this document does **not** decide legal ownership or licensing terms. [R7, R9, R12]

## 12. Definition of a successful agent assignment

A successful assignment leaves a clear answer to five questions: what invariant or behavior was examined; what evidence supports the conclusion; what precisely changed; what was independently verified against which implementation; and what remains unknown.

The best unit of work is **one accountable invariant plus a bounded implementation/test surface**, not “find something to improve somewhere in this folder.” The hierarchy makes that unit available at parent, component or smaller scope while preserving Demuxe's cross-component contracts.

## 13. Sources and provenance

Repository links are pinned to the reviewed commit unless explicitly identified as a live PR. Directory and file anchors in the cards are navigation sources, not a claim that every body was inspected. Test filenames came from the inspected suite registry/package scripts; test existence and names alone do not establish adequate coverage.

- **R1.** [Reviewed commit](https://github.com/Jagalite/demuxe/commit/d467c6bbe693bd64f142d62d391519883250792f).
- **R2.** [Source root and integration surfaces](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/).
- **R3.** [Internal adapters and backends](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/internal/).
- **R4.** [Pure machine modules and effect implementations](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/).
- **R5.** [Player UI source tree](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/player/).
- **R6.** [Preview implementation tree](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/src/preview/).
- **R7.** [Player composition and source-scoped effect/resource integration](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/unified-player.ts#L1-L235).
- **R7a.** [Composed transition and retirement rules](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/internal/machine/transition.ts#L1-L90).
- **R8.** [Preview controller and pure authority integration](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/preview/controller.ts#L1-L125).
- **R9.** [Package scripts, exports and package metadata](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/package.json).
- **R10.** [API stability runner](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/run.mjs).
- **R10a.** [API stability suite registry and surface mapping](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/tests/api-stability/suites.mjs).
- **R11.** [Project testing standard](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/docs/TESTING-STANDARD.md).
- **R12.** [Contribution rules and license/provenance review requirements](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/CONTRIBUTING.md).
- **R13.** [Provider package inventory](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/packages/).
- **R14.** [Open draft PR #6, inspected October 15, 2026; refresh before assignment](https://github.com/Jagalite/demuxe/pull/6).
- **R15.** [Native source tree](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/native/).
- **R16.** [Browser worker/glue tree](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/web/).
- **R17.** [Private mpv cooperative host/worker modules](https://github.com/Jagalite/demuxe/tree/d467c6bbe693bd64f142d62d391519883250792f/web/private-mpv/).
- **R18.** [Lower-level BrowserPlayer, distinct from the player web component](https://github.com/Jagalite/demuxe/blob/d467c6bbe693bd64f142d62d391519883250792f/src/player.ts#L1-L100).
- **E1.** [Official Git worktree documentation](https://git-scm.com/docs/git-worktree).
- **E2.** [Official GitHub CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
