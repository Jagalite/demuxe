<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Modular provider distribution

The branch assembles three independently licensed local npm artifacts from the
same monorepo: Apache `demuxe`, `@demuxe/provider-ffmpeg`, and
`@demuxe/provider-mpv`. The public Player API is unchanged. Raw package templates
remain private and refuse `npm pack`; the audited assemblers produce the actual
packages with explicit exports and no install scripts. Nothing is published.

The original source/legacy distribution keeps its existing routing behavior.
Only the modular core assembler enables explicit deployment catalogs. Its
maintained build registry is pinned to browser evidence and core source hashes;
changed source requires explicit candidate assembly and renewed validation.

## Capabilities, implementations and packaging

`PLAYBACK_PLANS` remains ordered policy and qualification. The 29 finite
`execution-recipes.ts` entries describe existing complete compositions and
lifecycle owners. Source, selected tracks/features and runtime admission still
run first. A package cannot introduce a composition or qualify itself.

Capability requests contain `{capability, version, profile}`. Providers describe
technology, delivery, implementation identity, offered contracts and asset
closures. Logical roles do not imply separate files: a native implementation,
bundled JS/TS, one fine-grained Wasm file or a shared bundle can satisfy an
explicitly qualified binding. The current packages retain broad FFmpeg and
atomic mpv implementations. They do not advertise independent codec APIs that
those implementations cannot currently expose.

The FFmpeg package currently offers packet-copy and video-only preparation using
the matching pthread remux build. The mpv package provides Hybrid, full Software
and selected-audio services. It includes both Software presenters but loads only
the selected engine. Private JSPI/Asyncify, audio adaptation and standalone
subtitle services remain available in the legacy checkout; they are not included
in these packages without matching provider provenance and qualification.

Fine and bundled future builds should compile the same implementation sources
with different export/link sets. Qualification must bind the complete composition,
ABI, build identities, selected source/tracks and runtime; common implementation
unit tests are reusable, while each physical variant still needs integration,
asset, cancellation and output evidence. No independent codec combination becomes
automatic merely because all its individual providers exist.

## Explicit deployment

Install the desired packages, then compose a fresh deployment directory:

```sh
python3 scripts/deploy-providers.py \
  --core /path/to/node_modules/demuxe \
  --provider /path/to/node_modules/@demuxe/provider-ffmpeg \
  --provider /path/to/node_modules/@demuxe/provider-mpv \
  --output /path/to/new-public-assets
```

Omit either or both provider arguments for a reduced deployment. The tool never
searches npm, installs packages or modifies an existing output directory. It
checks compatibility, installed asset hashes, implementation identities, paths,
symlinks and collisions before writing. Serve the output at the existing
`assetBase`; normal browser isolation/runtime requirements still apply.

`demuxe-providers.json` declares schema/contract version, deployment revision,
providers and assets. Each asset has `{id, path, sha256, bytes, dependencies}`;
each provider has `{id, implementationIdentity, technology, delivery,
applicationBuild, offers, assetIds, packageName}`. The parser rejects incompatible
contracts, malformed paths, missing dependencies and cycles. Parsing is not
qualification or proof of instantiation.

An omitted or unqualified provider makes an otherwise admitted candidate
`DEPLOYMENT_UNAVAILABLE`. The next already-admitted plan may run in the same
order only when its own required providers exist. Exhaustion reports the missing
requirements. A declared asset that returns 404, wrong bytes, or an initialization
error is an asset failure, not unsupported media or permission to silently change
implementation. A modular deployment without its catalog fails explicitly.

## Acquisition and lifecycle

The per-player runtime resolves admitted recipes against the maintained build
registry. It also recomputes each optional provider's asset-set identity, so a
manifest cannot retain a reviewed identity while substituting expected hashes.
The generic `ProviderAcquisition` retains immutable, scope-specific resolution
tickets and owner disposal; its read-only byte path supports existing inspector,
preparation and backend lifecycle owners without inventing another backend.

Selected owners request bytes lazily. Bounded streaming checks length, SHA-256,
deadline and cancellation before Wasm compilation or font use. Asset bytes and
compiled modules are shared within the player; independent copies protect cached
bytes from transfer/mutation. Software requests its verified engine after the
worker chooses YUV or RGB, including WebGL-unavailable fallback. Preview has an
independent disposable acquisition scope. Destroy aborts pending acquisition and
waits for cleanup. JSPI/Asyncify remain runtime choices of the relevant owners;
an unavailable selected variant is not silently replaced with another variant.

JavaScript module/worker URLs retain normal browser loading semantics. Installed
JS bytes are checked by package/deployment tooling, but URL imports do **not**
claim runtime SRI verification. Serve reviewed immutable assets over a trusted
origin. The maintained package registry is not a general third-party code loader.

Native availability and application-bundled implementations need no optional
asset download. Asset/load/compile state remains separate from media qualification.
The existing cost helper can compare measured whole-recipe observations with
freshness and resource constraints; it remains a shadow helper. No unmeasured
cost ranking or new production preference is enabled.

## Package and source audits

`licensing/provider-packages.json` separates ownership from license. Even an
Apache/MIT provider adapter cannot enter the core package. Core has a positive
source allowlist, emitted static-import/public-declaration checks and reviewed
dynamic import sites. It has no provider dependency and no source maps embedding
unreviewed code. `package-player-core.py` compiles from source, never stale output.

`prepare-provider-package.py` compiles provider adapters and combines explicitly
listed runtime files with hash-matched native artifacts. `package-provider.py`
packs only the external build inventory and audits staging and final tar bytes.
The auditor checks exact file sets, exports, source hashes, ownership, per-file
license maps, pinned notices, engine identities and the source companion itself.
The companion contains every recorded native input, locked upstream source,
Emscripten source, relevant configuration/link map and matching current wrapper
source. See [provider relinking](PROVIDER-RELINK.md).

The retained native build was not marked clean. That fact stays visible. Three
standalone subtitle-service configurations are explicitly excluded because these
packages ship no standalone subtitle service. Source recovery used exact hashes,
not reconstructed substitutes. Fresh native release builds and a release campaign
remain publication work, not claims made by this local delivery.

Imported experimental/vendor files retain their original bytes. Exact existing
headers classify 91 as Apache and 34 as MIT; 36 remain `NOASSERTION`. Their hashes
are locked in `licensing/imported-work-provenance.json` and the boundary policy.
Unknown material is excluded from the package allowlists rather than relicensed.

## Validation and limits

[Completion evidence](../results/media-components/provider-completion/) records
actual clean installs and core-only, FFmpeg-only, mpv-only and combined browser
deployments. Checks cover output pixels, retained existing route order, selective
audio, YUV/RGB fallback, preparation, preview, missing providers, identity mismatch,
404/corrupt assets, lazy loading and browser retirement. This is bounded delivery
qualification with existing admission gates, not a new all-codec/device claim.

Publication, new lightweight codec/container implementations, qualification of
additional runtime/build variants and measured-cost routing remain separate work.
The original Player surface, synchronization owners, fallback order and atomic
full-mpv compatibility path remain in place.
