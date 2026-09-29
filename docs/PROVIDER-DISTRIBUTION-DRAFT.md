<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Provider distribution implementation and release gates

The media-component branch now builds and audits a real, provider-free Apache Player core tarball. A clean consumer installs it without provider dependencies, type-checks every public entry point, imports it without DOM/network activity, bundles it without mpv/FFmpeg code, and plays native media with both bundled and unbundled entry points. Optional engine package assembly is implemented but requires reviewed matching engine/source/relink inventories; no optional engine npm archive has been assembled or published. See [validation status](MEDIA-COMPONENT-WORKTREE-STATUS.md). Existing legacy and utility-core packaging are unchanged. Source templates remain private with failing prepack guards.

## Publish targets

- `packages/player-core`: `demuxe` Player core, Apache-2.0; locally assembled and tested, not release-qualified.
- `packages/provider-ffmpeg`: future FFmpeg implementation package with its own build/notice metadata.
- `packages/provider-mpv`: future mpv/FFmpeg implementation package with its own build/notice metadata.

Templates use the current version initially, but versions and compatible core ranges are declared independently. Provider contract version is 1. Do not remove private/prepack safeguards or publish placeholder exports before actual extraction and qualification. Current license expressions describe intended wrapper, engine, bridge and documentation materials; exact artifact maps/build records must match. Future providers require their own reviewed metadata.

`licensing/provider-packages.json` defines independent ownership policy. A provider-owned Apache/MIT adapter cannot enter core merely because its license is permissive. Unknown inputs fail closed. The separate `playerCoreSources` allowlist names every input of the full Player core. Provider types may be used during compilation, but no provider implementation import, public declaration reference or provider-owned input may enter its output. The original utility-core allowlist remains unchanged.

## Deployment catalog

`parseProviderDeployment(value, assetBase)` accepts:

```text
schema: 1
providerContractVersion: 1
revision: <deployment identity>
assets: [{id, path, sha256, bytes, dependencies: [asset IDs]}]
providers: [{
  id, implementationIdentity, technology,
  delivery: [browser | application-bundle | optional-assets],
  applicationBuild: <required for application-bundle>,
  offers: [{capability, version, profile}],
  assetIds: [asset IDs], packageName: <optional npm name>
}]
```

Paths resolve under one existing asset root. Independent package roots need a reviewed deployment mapping before integration. Missing/cyclic dependencies, traversal/encoded paths and incompatible contracts reject. Parsing performs no I/O and grants no qualification. Declared providers start configured-unverified; omitted providers are absent from this explicit catalog. Availability observations must match deployment revision and implementation identity.

Implementation identity must bind actual build/interface/runtime, not just npm version. Build tooling and loaders must verify that binding; parsing a string is not artifact verification. Application-build identity and asset hashes are retained for acquisition/evidence. The acquisition owner contract now verifies requested asset bytes. The existing media service loaders remain responsible for runtime/ABI checks; they are not yet driven by the deployment catalog.

`nextProviderPlan` consumes already-admitted, mode-filtered candidates in caller order. It requires maintained per-scope evidence for complete binding sets. Pending acquisition holds the candidate; omissions permit the next admitted plan; terminal acquisition errors stop. Exhaustion reports missing qualified provider requirements. This stage is not connected to production discovery yet.

## Exact archive audit

`scripts/audit-provider-package.py` takes a target, npm tarball, reviewed build inventory and independently supplied inventory SHA-256. It does not extract, install or publish. Nine archive/assembly regressions pass, alongside the actual core artifact audit and clean consumer.

Inventory schema:

```text
schema: 1
target: core | ffmpeg | mpv
sources: {repository/path: {sha256}}
files: {package/path: {
  sha256, kind: code | metadata | notice | asset,
  licenses: [exact SPDX identifiers],
  inputs: [complete repository-relative input closure]
}}
engineBuildRecord: <exact engine-build.json for provider targets>
sourceCompanion: {repositoryPath, sha256, ...matching-source metadata}
```

The packed license map covers every filename with its license list. The external inventory hashes final bytes, avoiding a self-hashing manifest. Provider manifests identify package/version, provider contract version, compatible core range, capabilities and asset hashes.

The auditor checks exact file sets/hashes, canonical paths, regular-file-only tar entries, resource budgets, metadata/exports, source hashes, ownership, license closure and pinned notice bytes. Core has no provider dependencies/install scripts and no source maps until an embedded-source audit exists. Providers require matching engine/source-companion records. Existing engine/relink verifiers remain mandatory.

Input closure is trusted release-build evidence. The auditor cannot prove a compiler/bundler reported every input; closure generation and release review must establish that evidence. It intentionally rejects unclassified vendor/build inputs until ownership and provenance are reviewed. This is an additional release gate, not a claim of completed compliance or package separation.

## Acquisition and service boundaries

`ProviderAcquisition` owns one attempted execution scope, not a global runtime cache. A trusted application supplies implementation owners matching configured build identities. Missing owners are explicit deployment gaps. Native probes and bundled JS owners can prepare without network requests. An owner requests only assets in its declared dependency closure; acquisition checks a bounded streamed response, exact size, SHA-256 and deadline before returning bytes. Shared assets are fetched once within the scope; owners receive independent copies so transfer or mutation cannot corrupt another role.

Only immutable resolution tickets produced against the current catalog may acquire a binding. Tickets require maintained composition evidence and cannot survive changed availability or source/runtime scope. Configured 404s, bad hashes, wrong sizes and initialization exceptions are terminal failures. Native/runtime unavailability is distinct. Dispose aborts pending work, disposes late results and releases owners in reverse order; owners must honor their abort signal and clean up partial initialization. This code does not evaluate manifest-supplied JavaScript or infer qualification from advertised capabilities. Asset declarations authorize owner access; they do not eagerly download every dependency.

Independently bundled core/provider modules preserve typed errors through a versioned internal error marker. Asset, permission, identity, cancellation and timeout errors retain their terminal classifications even when the modules have different `PlayerError` constructors; unmarked objects cannot claim that contract.

Current mpv service imports go through `provider-modules.ts` at the existing deployed asset paths. Software previews import mpv only when a software frame is requested, with an abort check before allocating an engine. The service lifecycle, JSPI/Asyncify selection, backend configuration and routing order are retained. The generic verified-byte acquisition scope is not yet connected to FFmpeg/mpv workers or Player discovery; URL module imports do not claim the acquisition scope's integrity guarantee.

## Reproducible local package commands

```sh
python3 scripts/package-player-core.py
node tests/player-core-package.mjs
python3 tests/provider-package-audit.py
```

The core compiler reads source directly with the locked TypeScript compiler, captures per-output source identities, checks static dependency closure and an explicit list of reviewed computed import sites, then includes only the public declaration closure. It never copies a stale generated tree or bundles engines. Both the staging bytes and exact tarball are audited. The assembly report records archive and external inventory hashes. The clean consumer uses only the installed tarball, without workspace resolution or optional packages. Its native playback result does not qualify reduced-deployment automatic fallback.

`package-provider.py --target ffmpeg|mpv --payload <staging-directory> --record <inventory.json> --record-sha256 <reviewed-hash> --output <new-archive.tgz>` packs only inventory-listed files. It refuses symlinked inputs, unsafe paths, missing provenance/license/engine/source material and existing output files; it audits before and after assembly. It does not fabricate engine build records or corresponding source companions from copied runtime binaries.

## Remaining release and activation gates

- Connect the verified-byte owner contract and deployment catalogs to actual FFmpeg/mpv acquisition only after source/runtime-qualified bindings are available. Production routing remains unchanged as requested; reduced deployments do not yet control Player discovery.
- Produce exact reviewed FFmpeg/mpv build inventories, matching source/relink companions and notices, then assemble and audit those optional npm packages and test their installed consumers. Copied legacy runtime assets are sufficient for local playback tests, not a replacement for package release provenance.
- Qualify automatic core-only, FFmpeg-only, mpv-only and combined deployments in browsers. The ordered resolver/acquisition tests cover those deployment decisions with synthetic qualification envelopes; they do not establish media qualification.
- Complete the wider media/runtime/browser matrix and gather comparable whole-recipe measurements before activating measured-cost selection. Cost comparison remains a shadow helper and benchmarks remain deferred.


## Imported-work license audit boundary

The maintained tracked-file license check passes. A separate audit of **all untracked files** reports 161 failures, all belonging to the original-checkout integration inventory (research snapshots, experimental/vendor files and an unclassified note). New files outside that inventory pass. Details are preserved in `results/media-components/provider-delivery-20260928/all-untracked-license-check.json`. These inherited files are excluded from the explicit core package allowlist; the exact core tarball audit passes. Their license/provenance issues must be reviewed before including them in any future distribution or source companion. No notices or historical evidence were relabeled to make the audit pass.
