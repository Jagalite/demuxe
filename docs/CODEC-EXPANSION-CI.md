<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Pinned codec expansion CI qualification

The maintained CI workflow first runs the standard [provider conformance suite](PROVIDER-TESTING.md) against every offer in the selected installed packages. It then tests the installed-package packet and composition matrix in Chromium and Firefox. It covers both assets and embedded delivery,
reference PCM and video, precision rejection, pause, seek, fresh post-seek audio,
selective native loading, and a deliberate silence control. It is a functional
package gate; it does not promote the production registry or publish packages.

## Prepare reviewed inputs

Build and audit the packages selected by
`scripts/setup-codec-expansion-consumer.mjs`, then generate the decoder fixtures.
The package build inventories must match the current checkout, including generated
native files, corresponding-source companions, and packaging configuration.
Regenerate inventories when their recorded inputs change even if archive bytes do
not change. Export into a fresh directory:

```sh
CODEC_EXPANSION_CONFORMANCE=build/codec-expansion/conformance-fixtures.json \
CODEC_EXPANSION_SUPPLEMENTAL=build/codec-expansion/supplemental-browser.json \
  node scripts/codec-expansion-ci.mjs export build/codec-expansion-ci-inputs
```

For a focused follow-up cohort, set `CODEC_EXPANSION_TARGETS` to a JSON array of targets in the order exported by `scripts/codec-expansion-ci.mjs`. Every cohort requires core, container, the five base audio families, FLAC and Opus encoders. Add the providers used by the supplemental and packet manifests. The selected targets are pinned in the inventory and restored during preparation; fixtures whose provider is absent are rejected. This keeps separate priority groups within the existing 2 GiB input budget. Omitting the variable exports all targets.

The export re-audits every exact archive. It includes package archives, build
inventories, every source input those inventories name, corresponding source,
fixture media and reference bytes, and the maintained harness/tooling sources.
Omit `CODEC_EXPANSION_SUPPLEMENTAL` for the original matrix. When supplied, all supplemental media and required precision references are copied from their source paths into canonical repository-relative locations, fixture IDs are namespaced, and the rewritten manifest is pinned. Supplemental composition rows omit packet JSON and redundant scalar references: the host decodes media independently; only integer s32 or float f32/f64 precision controls are retained. This preserves rate/channel/container metadata and independent MOV AAC edit sample counts. CI restores and consumes that exact manifest automatically. Identical bytes are stored once under their SHA256. The printed inventory SHA256
is the separately reviewed pin supplied to CI; it is not read from the downloaded
archive as an authority.

Optional packet manifests use `CODEC_EXPANSION_PACKET_MANIFESTS`, a JSON array of paths (or `CODEC_EXPANSION_PACKET_MANIFEST` for one path). The exporter preserves codec framing, original sample counts, timestamp provenance and exact rejection reasons. Raw TrueHD, MLP and DTS-HD inputs are admitted only with their matching codec/family metadata. WMA Pro/Lossless/Voice are packet-only; Voice has a fixed SNR/error qualification and mandatory decoded silence/corruption controls. TAK standalone rows retain the full original integer sample extent.

Retained conformance descriptors use `CODEC_EXPANSION_CONFORMANCE`. Their source media, original packet JSON, independent PCM and native timing references are copied and hash pinned separately from composition references. Missing suites or matching references make conformance incomplete and stop the workflow. The conformance adapter loads the installed core wrapper and selected provider artifacts; checkout compilation does not substitute for the candidate.

Run the installed standard gate locally after preparing a cohort:

```sh
node scripts/test-codec-expansion-providers.mjs build/codec-expansion/installed.json
```

CI reports also record the actual host FFmpeg and ffprobe executable paths, binary hashes and version output. Packet references remain pinned independently; this provenance identifies the host tools used for composition validation.

The archive contains unique blobs and is bounded to 2 GiB, with a 256 MiB limit per file. Logical restored inputs may be larger because multiple names can reference the same blob. The extractor bounds raw gzip/tar headers and extension metadata before Python parses them.

Create a regular-file-only archive:

```sh
python3 - <<'PY'
from pathlib import Path
import tarfile
root = Path('build/codec-expansion-ci-inputs')
with tarfile.open('build/codec-expansion-ci-inputs.tar.gz', 'w:gz') as archive:
    for source in sorted(root.rglob('*')):
        if source.is_file():
            archive.add(source, arcname=source.relative_to(root), recursive=False)
PY
```

Upload that archive to an explicitly authorized release or equivalent artifact
store. Dispatch `.github/workflows/codec-expansion.yml` on the matching source
revision, passing the release tag and independently retained inventory SHA256.
The workflow only reads release assets and uploads result artifacts. No action in
this process authorizes uploading or publishing assets automatically.

## Fail-closed checks

The extractor rejects traversal, links, duplicate entries and excess bytes. The
preparer checks every blob and source hash, rejects checkout conflicts, repeats
package/source audits, installs the exact archives with scripts disabled, and
constructs an assets and embedded bundle for each included decoder family. It never replaces a conflicting existing file.

The runner requires `CI=true` and an explicit `BROWSER=chromium|firefox`. Local
browser work uses the collaborative preview. The runner requires every original family and delivery form, plus every supplemental fixture in both delivery forms. It binds every expected case
to its fixture metadata, independently determines precision rejection from reference
samples, rejects missing/duplicate cases, checks fresh audio after seeking, and
requires the muted post-seek control to fail. All source, package, fixture and
bundle bytes must remain unchanged across the run. Reports retain the inventory
pin, package identities, complete file hashes, browser version and case results.

Run the nonbrowser guard tests locally:

```sh
node --test tests/codec-expansion-ci-contracts.mjs
python3 tests/codec-expansion-extract.py
```

## Remaining shipping gates

A passing workflow establishes its exact packet/composition cases for its exact
artifacts and browser versions. Current local Chromium evidence does not establish
Firefox qualification. The CI job has to run successfully before claiming that.
AC3/EAC3 full-file JSPI/Asyncify uses its separate installed-player harness and
requires a Firefox Asyncify run; Firefox JSPI absence must remain a capability
rejection. Broad FFmpeg and atomic mpv playback use the existing pinned native
bundle workflow, with their own current artifacts and finite route evidence.

Source selection/acquisition tests cover deployment absence versus terminal asset
failure and resource exclusions. They do not establish broad native playback.
The new packet families cannot all fall back to `audio-common`: that provider's
finite codec contract remains AC3/EAC3/DTS core. Broader fallback claims require
an admitted full-file plan and matching qualified evidence.

Final release construction, corresponding-source verification, exact final core
and provider identity checks, required real-file/long-duration regression tests,
and explicit registry/release sealing remain separate gates. This workflow never
copies a candidate's success into historical production qualification records.
