<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Consolidated mpv source and package gate

The local source/package gate **passes** for the retained consolidated mpv candidate. This is not release qualification and does not change default Player routing, production assets, or the ordinary mpv catalog.

Evidence: [compact source/relink report](../results/media-components/bundling/unified-mpv-source.json). Historical browser evidence remains scoped to the exact candidate in [unified mpv review](../results/media-components/bundling/unified-mpv-review.json); no new browser campaign or qualification transfer is claimed here.

## What was verified

- The inherited corresponding-source archive has 8,888 manifest-exact files, covering 143 original native inputs, 8,562 SDK preferred-source files, 14 locked upstream archives and 27 applicable original configurations. The three standalone subtitle-service configurations remain the previously reviewed exclusions.
- All 23 inputs hashed by the original unified native record remain exact. All six generated replacement sources (`ao`, `buffer`, `vo`, `yuv`, `rgb`, `mode`) reconstruct exactly from the retained generator and original preferred source.
- A replay of the original final command produces **byte-identical JavaScript and Wasm**. Output/map paths and the private SDK cache location are redirected. Eleven application/SIMD translation units compile; native codec/dependency libraries and SDK libraries are reused rather than rebuilt.
- All 25 linked library archives remain hash-identical before and after replay. Seven were hashed by the original unified record; eighteen are explicitly supplemental observations. Their retained bytes and the successful replay establish relink correspondence, without inventing historical hashes or claiming a clean dependency rebuild.
- The candidate's four mode adapters and two native files are checked against their exact generators/native outputs. The ordinary package auditor passes before and after assembly using a recorded private consolidated-layout override. The public catalog is untouched.
- Six actual mutation controls reject altered inherited source, original native record, replayed output, library provenance, mode adapter and native candidate bytes.

The exact upstream sources, native patches and dependency configuration commands are retained. The original `scripts/build.sh`, `scripts/build-playback-deps.sh`, `scripts/configure-zimg.py`, source lock and SDK preferred source accompany the original build evidence. Generated unified sources, original/replayed commands and maps, and all 25 retained link archives accompany this candidate.

## Exact local artifacts

Under `build/codec-expansion/unified-mpv-source-02/`:

| Artifact | SHA-256 |
| --- | --- |
| `demuxe-provider-mpv-unified.tgz` (41 files) | `25b802c7dc619cf066dddf5fdc7200ee2a05feb750db1edb7d3d41ff6618ae44` |
| `unified-mpv-source.tar.gz` (8,940 files; 136,777,776 bytes) | `f2ba92e46924cc827f33f8e0d88f42ef144bd286fa8db833babbddabf9722dc6` |
| `build-inventory.json` | `8a3ec972f8d0a0bfd3bf97b2144e1302411e0985d3e12e8114f567c1fc3528c0` |

The runtime identity remains `sha256:246d8e3251d81ee0292bfb49d25a59d4b5a985a05c019bb17905066cc0448030`.

Native output identities:

- `player.wasm`: 22,574,902 bytes; `1b41b151c048347274b29772550421f14d8067ebd8344f3fdfa07c77856a7ee6`.
- `player.mjs`: 62,370 bytes; `d1565d73165cd26fbc0cc71e3f41211200742dff3586df921fb675125436416e`.

Original unified record: `9aad5b5a62f05ed72e277c5aee1a23cf810828bf39f49f5179e1b37ead404302`. Original source archive: `f6c03b6ab618566ec0b3f250071b8769bf6567aa9885a53f2f976f644dbcac95`. Both original records and artifacts remain preserved. The first intermediate assembly remains under `unified-mpv-source-01/`.

## Repeating the local assembly

[The isolated packager](../scripts/package-unified-mpv-source.py) accepts the original worktree, native candidate, browser-reviewed provider directory, inherited source archive, successful replay directory and a **fresh** output directory. It pins the original source/native/generator identities and requires byte-identical replay plus unchanged library fingerprints. It does not run a native build, install dependencies, update the public catalog, publish, or replace old output.

```sh
python3 scripts/package-unified-mpv-source.py \
  --old-root /Volumes/seed2/Projects/demuxe-media-components \
  --native /Volumes/seed2/Projects/demuxe-media-components/build/mpv-unified/candidate-02 \
  --candidate /Volumes/seed2/Projects/demuxe-media-components/build/bundle-flexibility/mpv-unified-review-01/provider \
  --inherited-source /Volumes/seed2/Projects/demuxe-media-components/build/media-components/provenance/pthread-providers-source-v2.tar.gz \
  --relink /tmp/demuxe-unified-relink-02 \
  --output build/codec-expansion/unified-mpv-source-fresh
```

[Mutation controls](../tests/unified-mpv-source-gate.py) use the same material arguments, without `--output`. Their temporary material copies never modify the original candidates.

The source companion preserves historical absolute command paths as provenance. A recipient rebases these paths to the extracted `demuxe/`, SDK and `relink-materials/` locations before relinking; compiler binaries may require installing the recorded SDK. The supplied preferred sources and patches support modification/rebuilding, while the retained library replay documents this exact historical output. Cross-host byte-identical dependency builds are not claimed.

## Remaining production gates

The ordinary public mpv profile still describes four legacy engine Wasm files. Consolidated production layout integration needs review before final package assembly. The final runtime/core must retain fresh required-browser/platform release evidence; Linux/Firefox and broad FFmpeg release gates remain independently open. A clean dependency rebuild, release publication and deployment were not performed by this gate.
