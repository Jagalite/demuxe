<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Optional audio codec production qualification

mpv remains one atomic provider. Codec packages implement existing, finite
preparation plans; manifests cannot add playback plans or qualify new builds.

## Maintained contracts

| Implementation | Input and output | Intended use |
| --- | --- | --- |
| Decoder-specific FFmpeg preparation | Local clear Matroska File, one AVC/HEVC video, selected 48 kHz TrueHD/MLP or DTS-HD audio; copied video and FLAC24 in fragmented MP4 | Normal Player playback, bounded reads/output buffering, B frames, seeks and alternate audio tracks |
| Packet decoder + TS container + FLAC encoder | AVC with no picture reordering; exactly one audio and video track; supported Matroska blocks and continuous timestamps | Smaller component deployments and explicit component APIs |

Initial decoder families are shared TrueHD/MLP and separate full DTS-HD MA.
TrueHD supports stereo, canonical 5.1 and 7.1; MLP supports stereo and canonical
5.1; DTS-HD MA is qualified for canonical 7.1. These are 48 kHz contracts.
The measured lossless outputs preserve integer PCM through 24 bits, channel
positions and video content. They do not preserve Atmos object presentation.
The browser may downmix for the physical output device; that device behavior is
separate from encoded-channel correctness.

Full FFmpeg providers reuse the existing demuxer, timestamp, worker, MSE and
seek implementation. Each enables only its named audio decoders and the FLAC
encoder. They retain video parsers and packet-copy support, with no video
decoders. Both private JSPI and Asyncify builds are available. A browser must
support the copied video's MSE configuration. Unsupported media and features
retain existing fallback requirements; deploy the atomic mpv provider when
Hybrid/Software fallback is needed. Embedded/external mpv subtitle compositions
retain their existing service and broad preparation packages.

The TS Blob convenience API limits input to 64 MiB and output to 96 MiB. Its
fragment API supports larger sources with a bounded queue, but consumers own
MSE append, eviction and seek restart. The automatic Player component path uses
the bounded convenience API. The full FFmpeg File path has no 64 MiB limit.

## Deployment

Install the core and the required family/runtime packages:

- `@demuxe/provider-ffmpeg-truehd-mlp-jspi` / `-asyncify`
- `@demuxe/provider-ffmpeg-dts-hd-jspi` / `-asyncify`

Use `scripts/deploy-providers.py` to assemble their verified deployment. Assets
live under separate `web/providers/preparation/<family>-<runtime>/` prefixes;
they coexist with existing FFmpeg and mpv packages. Only the selected family's
engine is needed for preparation. Complex metadata inspection may first load an
available inspection engine; switching decoder families loads the new engine.

Automatic runtime selection honors deployed engines and browser support.
Explicit `remuxRuntime: 'jspi'` or `'asyncify'` pins a runtime; `'on'` selects a
private runtime when a deployment also contains the pthread FFmpeg provider.
`nativeRemux: 'never'`, source/track permissions, selected subtitles and browser
admission remain mandatory. A direct readiness failure may try an already
admitted preparation plan, preserving the original full-budget retry.

The smaller packet packages are `@demuxe/provider-audio-truehd-mlp`,
`@demuxe/provider-audio-dts-hd`, `@demuxe/provider-audio-flac`, and
`@demuxe/provider-container`. The core exports finite selection and verified
acquisition from `demuxe/components`; the container exports owner factories and
Blob/fragment APIs. Imports instantiate and fetch no codecs. Acquire the exact
binding before `owners.execute(...)` or `owners.executeFragments(...)`; keep
acquisition alive during iteration, and dispose it afterward. Iterator return,
cancellation and exceptions release active decoder/encoder owners.

## Qualification evidence

Reports are under `results/media-components/production-audio` and
`results/media-components/production-preparation`; failed attempts are retained.
Fixtures include distinct-tone stereo/5.1, bounded specialist 7.1 streams,
reordered AVC, a 120-second source, large File input and multiple lossless audio
tracks. Specialist streams are technical fixtures, not a broad movie corpus.

| Gate | Current state |
| --- | --- |
| Decoder sets, owned integer PCM and complete host output | Passed for priority cases |
| All six packet-provider native builds and package/source audits | Passed |
| Four full-file native builds and package/source audits | Passed |
| Chrome/Firefox six-case installed packet output and channel identity | Passed |
| Original-file public Player, seek, cancellation and reopen | Passed on the final core bytes |
| B frames, large File, alternate audio, HEVC | Passed Chrome JSPI/Asyncify and Firefox Asyncify |
| Missing/corrupt native assets | Passed Chrome/Firefox; terminal asset errors |
| Legacy AC-3/E-AC-3/DTS/FLAC components and atomic mpv fallback | Passed on the final core bytes |
| Sustained playback and EOF | Passed: 120-second TrueHD and 60-second DTS-HD at 2x in all three runtime/browser combinations |
| Current source contract checks | Passed, 104 tests |
| License boundary and violation tests | Passed, 13 violation tests |
| Final source/evidence qualification | 29 required sealed reports, including modular release guards; 11 audited provider archives |
| Ordinary core assembly | Passed; final archive is byte-identical to the tested core |

## Measurements

`production-preparation/file-sizes.json` records exact input hashes and raw,
gzip and Brotli sizes. Compared with the existing broad adaptation engine,
MJS + Wasm raw bytes decrease by 20.5% / 24.7% for TrueHD/MLP and 12.9% / 15.6%
for DTS-HD (Asyncify / JSPI). At gzip level 9 the reductions are 24.3% / 27.3%
and 15.4% / 17.0%. Compression figures are potential HTTP body sizes; deployment
must actually enable that encoding.

Packet-only decoder + FLAC Wasm totals are 511,601 bytes for TrueHD/MLP and
793,339 bytes for DTS-HD, with the narrower container contract above.
Full-file engines retain the existing 64 MiB initial heap. Splitting does not
establish a RAM saving for that path.

Matched preparation reports retain three repetitions, alternating order,
exact decoded-output comparisons, process CPU deltas and sampled Chrome RSS.
They do not establish a consistent startup or CPU improvement. Filesystem and
host activity affect elapsed times. Download size and selective decoder
loading are the established benefits; no performance ranking is admitted.

## Repeatable build and checks

Use FFmpeg n9.0.2 and the recorded Emscripten 4.0.14 SDK. For full-file engines:

```sh
python3 scripts/build-codec-preparation.py --profile truehd-mlp --suspension asyncify \
  --output /path/outside/checkout/truehd-mlp-asyncify-01 --sdk /path/to/emsdk-4.0.14
```

Repeat for `dts-hd` and `jspi`. Record preferred/transformed source, static
archives, command logs, link map and artifact hashes with
`scripts/record-codec-preparation-build.py`; produce the matching source
companion with `scripts/package-provider-source.py`; assemble and audit with
`scripts/prepare-provider-package.py`. `docs/PROVIDER-RELINK.md` describes the
retained source and replacement/relink boundary. Build output alone never
qualifies a runtime. `scripts/qualify-codec-providers.py` verifies all required
reports, current sources and exact archives before sealing immutable evidence.
The final `player-core-production-final-review-02` archive is byte-identical to the
installed candidate used for these tests.

`scripts/package-codec-application-source.py` retains the final preferred
application/glue source and its per-file licenses alongside the exact native
source companions. Distribute these source artifacts with their matching
packages; changing library or application inputs requires rebuilding the
matching manifests and core qualification.

The installed consumers are assembled by
`scripts/setup-codec-preparation-consumer.mjs` and
`scripts/setup-lossless-component-consumer.mjs`. Run the host/output tests,
`tests/codec-preparation-player.mjs`, `tests/codec-preparation-real-player.mjs`,
`tests/codec-preparation-faults.mjs`, `tests/codec-preparation-soak.mjs`, and legacy installed/runtime regression
checks against the exact assembled archives. `BROWSER=firefox` selects Firefox;
`CODEC_RUNTIME=jspi` selects JSPI in a supporting browser. Keep native build scratch and media outputs on the external build volume.
Browser scratch profiles should use the local temporary volume (`TMPDIR=/tmp`);
external-volume profiles caused navigation and teardown stalls in this campaign. Firefox JSPI absence is an explicit browser
capability rejection; Asyncify is its qualified preparation runtime.

Future maintained recipes can add other rates, layouts and codec families.
AAC gapless metadata and Opus encoding/container permission need separate
qualification. The wider lab codec results remain experiments until their
complete recipes, installed output and lifecycle contracts are qualified.

## Modular release handoff

`audioRepairRecipe` rejects MLP 7.1 and DTS-HD stereo/5.1 until those combinations
are qualified. The final application source archive includes the core package
template; an extracted-source core rebuild must match the qualified archive.

Prepare a handoff containing the core, every provider in
`licensing/ci-slices.json` (currently 30 slices), all native and
application source companions, and the sealed evidence:

```sh
python3 scripts/modular-release.py prepare \
  --qualification build/codec-preparation/production-qualification.json \
  --output build/modular-release-candidate
```

After committing the reviewed source and creating a `modular-` release tag,
repeat with `--tag modular-<version>` into a fresh directory. The tagged command
compares release inputs to the tag and rejects dirty or untracked source inputs.
The handoff can be published with `scripts/publish-github-release.py --modular`
using its existing `--assets`, `--tag`, `--commit`, and `--repo` arguments.
The **Build and stage modular codec packages** workflow then downloads that
public release, validates every package/evidence/source hash and tag identity,
and stages the core and all catalog slices for maintainer approval. Configure npm trusted
publishing for each package and that workflow before invoking it. Published
versions with different bytes are rejected; matching existing versions are skipped.

Both tag release workflows call the shared source build for all 30 catalog
slices and four broad providers at the selected tag. Each package and its
corresponding source are retained in `source-provider-*` Actions artifacts; the
collector rejects missing, duplicate or wrong-revision providers. The monolithic
GitHub release waits for this build, and modular npm staging also requires it.
The modular handoff retains the exact catalog and rejects omissions, duplicates
and a catalog differing from the tagged source. Fresh build artifacts are
candidates: they do not replace the exact-byte qualification and source-rebuild
evidence required to publish. The original 11-provider qualification report
therefore cannot publish the expanded catalog.

Modular tags are excluded from the monolithic tag release workflow. Preparing
or verifying a local handoff does not commit, tag, upload or stage packages.
