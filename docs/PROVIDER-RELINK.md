<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Corresponding source for the optional providers

Keep the companion named and hashed in `source-companion.json` alongside the
provider npm archive. These are local package candidates, not a published
release. `engine-build.json` retains each original build's actual provenance,
including dirty/recovered status, tools, sources, flags and engine hashes.

The companion contains:

* `demuxe/`: every exact input recorded by the native build, plus the locked
  upstream archives under `build/downloads/`.
* `toolchain/emscripten/`: the exact preferred Emscripten source, including
  linked runtime libraries.
* `build-materials/`: hash-matched configurations and link maps. The three
  standalone subtitle-service configurations are excluded from the broad
  pthread profile only. Other profiles declare their own exclusion set.
* `application/`: current Player/provider integration source, separately from
  historical native inputs. Current wrapper changes do not rewrite native history.
* `engine-build.json` and `source-manifest.json`: native evidence and the exact
  source byte inventory, checked by the provider package auditor.

For the broad pthread FFmpeg/mpv providers, unpack the companion and work in
`demuxe/`. Install Python 3,
CMake, Ninja, pkg-config, Git, curl, Node/npm and Meson 1.7.2. The historical build
scripts and locked source archives are supplied. Install/activate the recorded
Emscripten SDK version from the included `build/downloads/emsdk.tar.gz`, then use
`DEMUXE_SDK` to point the supplied `scripts/build-beta-engines.sh --clean` command
at it. The SDK installer may download host compiler binaries. See the retained
`application/docs/LGPL-RELINK.md` for the original complete build commands.


For the fine/common audio providers, the companion retains
`native/audio-codecs/{decoder,encoder}.c`, `scripts/build-audio-providers.py`,
the pinned FFmpeg source archive and patches. Use the recorded SDK 4.0.14:

```sh
python3 scripts/build-audio-providers.py --sdk /path/to/emsdk-4.0.14 \
  --archive build/downloads/ffmpeg-adaptation.tar.gz --profile common
```

Use `ac3`, `dts` or `flac` instead of `common` for the fine builds. The build
uses the same source and ABI; each output still needs fresh identity and
qualification. The source lock is retained in `application/sources.lock.json`;
copy it to the relink root if that root was assembled only from native inputs.

For the JSPI/Asyncify providers, exact producer scripts, bridge sources, patches,
configuration, command records and adaptation static libraries are under
`demuxe/build/private-provider-materials/inputs/`. Each `build-result.json`
identifies its original producer and dependency build; `commands.json` records
configure/compile/link operations. Remux producers are `remux-<runtime>-02`;
adaptation library producers are `transcode-<runtime>-04`, followed by the
`transcode-<runtime>-05` relink. Use those recorded build/relink scripts with
paths rebased to the extracted material and installed SDK. Historical absolute
paths identify provenance, not a requirement to access the original checkout.
Retained observed configurations are distinguished from producer-hashed inputs.

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

## Decoder-specific streaming preparation

The `ffmpeg-truehd-mlp-{jspi,asyncify}` and
`ffmpeg-dts-hd-{jspi,asyncify}` packages retain the same FFmpeg file preparation
ABI and scheduler. They contain a selected decoder set and the FLAC encoder;
mpv remains a separate service.

Their native materials live under the companion's
`demuxe/build/codec-preparation/<provenance>/inputs/<codec>-<runtime>/`.
The exact `build-ffmpeg.py`, `suspension_profile.py`, patched C sources,
FFmpeg patches, configurations, static libraries, link map, and command record
are retained. Extract the pinned FFmpeg archive to `source/` in that prepared
build layout and apply its retained patches. Rebase the paths in the recorded
link command to the extracted materials and installed SDK to relink using the
supplied static libraries or modified C adapters. For a library rebuild, use
the configure command recorded in `commands.json`; do not substitute a broader
decoder set under the recorded identity.

`codec-build-recipe.py` records how the prepared source was derived from the
reviewed application sources. It admits both six-channel FLAC back/surround
layouts without reordering sample positions. The corresponding-source record
retains the original linked JavaScript and records its distribution transform:
only an LGPL SPDX notice is prepended. The record script is supplied for
reproducing this transform. Native Wasm bytes are copied without modification.
