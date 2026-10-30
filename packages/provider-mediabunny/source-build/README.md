<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Preferred-source regeneration

MediaBunny's npm package contains `src` but omits its imported `shared` TypeScript helpers and root build configuration. This supplement restores those inputs from upstream revision `0f80f47e617b576737ffd4ce39a626eb7c7e934e`. `provenance.json` records the fetched archive digest and every retained source/configuration digest. The npm `src` files were compared byte for byte with that revision. Original upstream files remain unmodified under `mediabunny/` with their MPL-2.0 license and notices. `regenerate.mjs` is Demuxe code under Apache-2.0.

The upstream [build recipe](https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/scripts/build.sh) generates individual modules using `tsc -p src`, then runs [the import-extension postprocessor](https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/scripts/add-import-extensions.ts). Those are the stages consumed by these adapters. The original full build recipe is retained for context; do not run it in this supplement. Its extension packages, monolithic bundles, documentation and declaration-rollup targets are outside the adapter worker build.

Prepare the external tools once. From this package, either run `npm ci --ignore-scripts --prefix source-build/tools` or copy `tools/package.json` and `tools/package-lock.json` into a separate tools directory and run `npm ci --ignore-scripts` there. The lock pins TypeScript5.9.3, Node22 type definitions, the two DOM type packages and their transitive type dependency. Tool versions and the actual compiler hash are recorded in the regeneration receipt; build-tool packages are not playback dependencies. Node23.5.0 and esbuild0.28.2 are the currently verified worker-build tools.

```sh
DEMUXE_SOURCE_BUILD_TOOLS=/absolute/path/to/tools \
  node test/rebuild-source.mjs /absolute/path/to/candidate /absolute/path/to/receipt.json
```

The verifier checks the source companion's inventory, extracts it into a temporary directory, checks pinned source/tool versions, and runs a full TypeScript check/emission in an exclusively created output directory. It runs the unmodified extension postprocessor with Node's explicit `--experimental-strip-types` flag. All71 generated JavaScript modules must match the archived npm modules, including their complete file set. Only then does the adapter build consume the regenerated modules and compare final worker bytes and the provider manifest. No generated module from the live checkout is used to satisfy that final build.

Python3.12+ is required for archive extraction filtering. The shared pre-extraction validator rejects links, special files, noncanonical and duplicate names, file/directory collisions, excluded build-tool or AppleDouble paths, and archives exceeding its entry and byte budgets. It checks the recorded compressed-archive digest and validates and extracts the same in-memory bytes into an empty directory. The source-manifest checker also rejects duplicate inventory and compiled-input records. On macOS the producer disables AppleDouble metadata generation: those unlisted `._` records otherwise appear as extra modules with non-BSD extractors. Inventory checks reject them. Generated Python caches are also excluded. Temporary build/extraction trees are removed by the verifier.

This does not make source tarballs deterministic, bundle toolchain source, qualify browser playback, or approve distribution. The source companion and browser qualification remain distinct artifacts, and the package's private/prepack guards remain enabled.
