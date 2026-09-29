<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Media-component delivery status

Worktree: `/Volumes/seed2/Projects/demuxe-media-components`.
Branch: `modular-media-providers`. Consolidation checkpoint: `ea98201f`.
The original checkout remains unchanged; this branch contains the authorized
original tracked/untracked work and independent local runtime assets. No push,
tag, npm publication or benchmark was performed.

The current FFmpeg/mpv provider delivery is implemented. Legacy source routing
stays unchanged. The separately assembled modular core uses explicit deployment
facts through the existing Player API and existing ordered admission policy.

| Area | Delivered behavior |
| --- | --- |
| Policy and recipes | All 29 plan IDs retain their existing order, semantic admission and lifecycle owners; full mpv remains atomic |
| Providers | Logical capability/profile contracts remain independent of technology and packaging; current providers retain integrated engines |
| Deployment | Installed/configured qualified providers are required; absent providers reject candidates as DEPLOYMENT_UNAVAILABLE |
| Fallback | Only another already-admitted, available composition may run; asset acquisition failures remain terminal |
| Qualification | Maintained build identities, core source hashes and browser evidence; source/tracks/features/runtime-scoped admission; no package self-qualification |
| Loading | Actual inspector/remux/mpv/preparation/preview paths consume verified Wasm/font bytes; per-player deduplication and cancellation |
| Software | Worker chooses YUV/RGB before requesting the matching verified module; WebGL-unavailable fallback is covered |
| Packages | Apache Player core plus independently licensed FFmpeg and mpv npm artifacts, explicit exports, matching source/relink material and exact archive audits |
| Boundaries | Positive core source/import/declaration allowlists, independent ownership rules, retained notice hashes and complete license maps |
| Deployment tooling | Explicit package roots, hash/identity/compatibility checks, fresh output tree and generated catalog; no implicit installation |
| Costs | Existing pure readiness/cost comparison helpers only; no unmeasured automatic preference |

## Evidence

Current evidence is under [provider-completion](../results/media-components/provider-completion/).
It includes actual clean npm consumers, Chrome/Firefox disjoint deployment runs,
route and output observations, negative asset/deployment cases and browser cleanup.
The completion summary records final archive/source hashes and test counts.

The browser matrix exercises core-only Native; FFmpeg-only remux; mpv Hybrid and
Software; forced/injected RGB fallback; mpv fallback when preparation is absent;
combined remux preference; selected AC-3 audio; explicit preparation and software
preview; missing catalog/provider; wrong build; configured 404; and corrupted
Wasm. Native output is measured from presented pixels. This is bounded delivery
coverage, not a new all-codec/profile/device qualification claim.

Earlier integration and provider-delivery evidence remains historical in
[the integration record](MEDIA-COMPONENT-INTEGRATION.md) and
`results/media-components/provider-delivery-20260928/`. Do not conflate an older
archive's tests with a new artifact's identity.

## Assets and source provenance

All 42 copied runtime assets remain independently stored in this worktree. The
new packages use the ten main engine files whose hashes match the recovered
native build record. Every recorded native source input was recovered exactly;
the corresponding-source companion verifies locked upstream and Emscripten
sources, relevant configurations/link maps and current wrapper sources.

The native record retains `clean: false`. Standalone subtitle-service artifacts
had different provenance and are intentionally not included. The three unrelated
subtitle configurations are explicitly excluded, never represented as matched.
Private JSPI/Asyncify and adaptation services remain in the full legacy asset
layout; future separate packages require their own exact source/build evidence.

Imported vendor/research bytes were preserved. Their observed licenses are
recorded by exact path/hash; 36 files remain NOASSERTION and are excluded from
package input allowlists. This is not a relicensing of unknown material.

## Intentional future work

New fine-grained codec Wasm, TS container providers, private-runtime packages,
additional media/device qualification and measured-cost routing are separate
extensions. npm publication requires the normal fresh native release build and
release campaign. No public Player redesign, unrestricted planner, global engine
cache, automatic package installation or new plan preference was introduced.

See [distribution details and commands](PROVIDER-DISTRIBUTION-DRAFT.md),
[provider source/relink instructions](PROVIDER-RELINK.md), and
[the reviewed architecture plan](MEDIA-COMPONENT-IMPLEMENTATION-PLAN.md).
