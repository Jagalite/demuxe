<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Rebuild and relink the LGPL WASM engines

The matching `demuxe-<version>-source.tar.gz` is the machine-readable source for
the exact runtime release. It contains the original Apache Demuxe source needed
to relink, the original LGPL integration source, locked mpv/FFmpeg archives,
Demuxe patches, build scripts, generated configurations, linker maps and the
build record. Its `source-manifest.json` and the runtime `release-manifest.json`
bind these materials to the binary hashes. Keep both archives together.

## Rebuild the unmodified release configuration

On a host with Python 3, CMake, Ninja, pkg-config, Git, curl and Node/npm,
extract the source archive into a new directory. The example uses the matching
Emscripten 4.0.14 SDK. The source archive includes its hash-pinned installer
archive; the SDK installation downloads the platform compiler binaries. The
recorded host tool versions and hashes are in `build-materials/build/beta-build.json`.

```sh
tar -xzf demuxe-<version>-source.tar.gz
cd demuxe
python3 -m venv build/venv
build/venv/bin/python -m pip install meson==1.7.2 Jinja2==3.1.6 MarkupSafe==3.0.2
npm ci
mkdir -p build/emsdk-4.0.14
tar -xf build/downloads/emsdk.tar.gz --strip-components=1 -C build/emsdk-4.0.14
build/emsdk-4.0.14/emsdk install 4.0.14
build/emsdk-4.0.14/emsdk activate 4.0.14
DEMUXE_SDK="$PWD/build/emsdk-4.0.14" bash scripts/build-beta-engines.sh --clean > build/clean-build.log 2>&1
python3 scripts/verify-lgpl-closure.py
```

The build uses the exact flags in `scripts/build.sh`,
`experiments/software-full/build.sh`, `scripts/link-hybrid.sh`,
`scripts/build-remux.sh` and `scripts/build-subtitles.py`. `-Dgpl=false` and
FFmpeg `CONFIG_GPL=0`, `CONFIG_NONFREE=0`, `CONFIG_POSTPROC=0` are checked against
generated files. `build/link-maps/*.map` records the actual linked objects and
archives. The output is `web/engine/`, `web/engine-software-full/`,
`web/engine-hybrid/`, `web/engine-remux/` and `web/engine-subtitles/`.

Compare the rebuilt `build/beta-build.json` and `build/lgpl-closure.json` with
`build-materials/` from the companion. A different supported host may have
different binary hashes; the published record reports the exact release host,
compiler hashes, source hashes and archive hashes. No universal cross-host
bit-for-bit guarantee is made.

## Modify an LGPL component

The maintained patch replay intentionally rejects unrecorded edits in
`build/sources/`. Make a new working copy of the source companion and put your
changes into an additional patch in the matching series before the clean build:

- mpv: `patches/0013-my-mpv-change.patch` (after the maintained mpv patches).
- FFmpeg: `patches/ffmpeg/0010-my-ffmpeg-change.patch` (after the maintained
  FFmpeg patches).

The patches use the usual `--- a/path` and `+++ b/path` format relative to the
pinned upstream source root. `scripts/apply-patches.py` replays the complete
series against the SHA-256-verified upstream archive and applies the modified
source. Rerun the clean build command above. It recompiles and relinks each
engine from the new source. The release gate rejects any modified build that
brings GPL or nonfree code into this intended Apache/LGPL configuration; a
recipient can still make private changes under the component's applicable
license. The new patch and rebuilt binary are the recipient's changes, not a
claim that the published binary had those changes.

The Apache application source is supplied in full, rather than only opaque
objects, so it can be recompiled and linked with modified LGPL libraries. The
LGPL grants include the ability to modify/relink and reverse engineer for
debugging those changes. Consult the full LGPL text in
`LICENSES/LGPL-2.1-or-later.txt` and the upstream component notices.

## Optional engines shipped beside the standard engines

The published beta also included audio preparation and Native ASS. Their
matching `demuxe-audio-adaptation-source.tar.gz` and
`demuxe-native-ass-source.tar.gz` sit beside the runtime and standard source
companion. They include the preferred FFmpeg or subtitle-library source,
original Demuxe wrappers, build manifests, generated configuration and link
maps. To rebuild either after a source change, use fresh output directories:

```sh
python3 scripts/build-audio-adaptation.py --output build/audio-adaptation-clean \
  --sdk "$PWD/build/emsdk-4.0.14" --archive build/downloads/ffmpeg-adaptation.tar.gz --opus
cat build/audio-adaptation-clean/latest.json
python3 scripts/verify-audio-adaptation-build.py "PATH_FROM_LATEST_JSON"
python3 scripts/build-native-ass.py --sdk "$PWD/build/emsdk-4.0.14" \
  --archives build/downloads --meson build/venv/bin/meson \
  --output build/native-ass-clean
python3 scripts/verify-native-ass-build.py build/native-ass-clean/runtime
```

The optional builders consume the same locked archive hashes and can rebuild
with modified LGPL source. The audio-preparation FFmpeg build must still report
`CONFIG_GPL=0`, `CONFIG_NONFREE=0` and no postproc for this Apache/LGPL release
configuration. The optional source companions retain the exact original
release manifests, commands, source hashes and link maps for comparison.
Rebuilt outputs may have new hashes, as expected after a change.
