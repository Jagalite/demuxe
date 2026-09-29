<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Corresponding source for the optional providers

Keep the companion named and hashed in `source-companion.json` alongside the
provider npm archive. These are local package candidates, not a published
release. `engine-build.json` retains the original build's actual `clean: false`
status, tools, sources, flags, configurations and engine hashes.

The companion contains:

* `demuxe/`: every exact input recorded by the native build, plus the locked
  upstream archives under `build/downloads/`.
* `toolchain/emscripten/`: the exact preferred Emscripten source, including
  linked runtime libraries.
* `build-materials/`: hash-matched configurations and link maps. The three
  standalone subtitle-service configurations are explicitly excluded; these
  packages do not distribute that service.
* `application/`: current Player/provider integration source, separately from
  historical native inputs. Current wrapper changes do not rewrite native history.
* `engine-build.json` and `source-manifest.json`: native evidence and the exact
  source byte inventory, checked by the provider package auditor.

To modify/relink, unpack the companion and work in `demuxe/`. Install Python 3,
CMake, Ninja, pkg-config, Git, curl, Node/npm and Meson 1.7.2. The historical build
scripts and locked source archives are supplied. Install/activate the recorded
Emscripten SDK version from the included `build/downloads/emsdk.tar.gz`, then use
`DEMUXE_SDK` to point the supplied `scripts/build-beta-engines.sh --clean` command
at it. The SDK installer may download host compiler binaries. See the retained
`application/docs/LGPL-RELINK.md` for the original complete build commands.

The native driver builds more targets than these packages distribute. Compare
only the targets listed in the package's `provider-manifest.json` and original
record. Do not substitute newly generated artifacts under an old identity.
Cross-host byte-identical builds are not promised. Repackage changed output with
fresh source evidence and an implementation identity, and requalify its admitted
compositions before deployment.

The application source is supplied for modification and relinking; LGPL
permissions, including reverse engineering for debugging modifications, remain
available. No packaging step restricts those permissions. Apache wrappers do not
relicense native integration or third-party dependencies. Exact notices are in
`LICENSES/Native-Dependencies.txt`; the mpv package also retains the embedded
DejaVu Sans font license. This software uses the FreeType Project.
