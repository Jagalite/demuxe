<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Component implementation and local validation

The broad-provider foundation and the requested lightweight extensions are
implemented in `/Volumes/seed2/Projects/demuxe-media-components`, on
`modular-media-providers`. The original checkout is untouched. Nothing has been
published or pushed. Local installation and playback are the delivery target.

## Run locally

```sh
cd /Volumes/seed2/Projects/demuxe-media-components
npm run dev:providers
```

This installs the checked local npm archives and serves the regular Player
playground at `http://127.0.0.1:4179`. Its normal ordered playback plans remain in
place. Idle and browser-native playback do not fetch optional Wasm.

In another terminal:

```sh
npm run dev:components
```

Open `http://127.0.0.1:4188` for the component lab. Choose a recorded fixture and
fine, common, combined or missing audio providers. AVC/AAC packet copy uses TS
only; AC-3, E-AC-3 and DTS core use decode → FLAC24 encode → TS fMP4 → MSE.
The lab checks the tested core/provider identities, browser major and exact
fixture bytes. It is an explicit internal execution path, not a new Player API
or an automatic routing experiment on arbitrary user files. Ordinary files
continue through the regular playground's existing broad FFmpeg/mpv routes.

`node scripts/setup-component-consumer.mjs` recreates the component deployments.
Both launchers use local archives; no npm publication or runtime CDN discovery
is needed. Native artifacts, source companions and fixtures are stored in this
worktree, not symlinked to the original checkout or dependent on `/tmp`.

## Delivered work

| Area | Implementation and evidence |
| --- | --- |
| Logical contracts | `{capability, version, profile}`; independent native, JS/TS, fine Wasm and common-bundle providers; exact identities and asset closures |
| Explicit compositions | Existing 29 playback plans plus finite internal packet-copy and audio-repair recipes; no unrestricted graph search |
| Fine/common audio | One pinned FFmpeg source and maintained decoder/encoder bridges; AC-3/E-AC-3, DTS core, FLAC, and common builds; exact fine/common PCM and FLAC-byte equivalence |
| TS provider | Bounded finite Matroska reader, explicit-timeline fMP4 writer, TS-only packet-copy and component audio-repair executor |
| Private runtimes | Separate JSPI and Asyncify FFmpeg packages with matching native build/source material; explicit policies stay pinned; modular auto selects only deployed qualified variants |
| Independent fallback | Modular private preparation does not suppress atomic mpv; its own isolation, media, feature and deployment checks still apply |
| Loading | Selected owners only; common decode/encode shares one module; verified bytes, cancellation, source scopes and disposal |
| Cost selection | Actual complete-preparation startup/throughput measurements feed binding selection; exact source/browser/build/deployment/readiness context; missing CPU/memory evidence remains missing |
| Distribution | Ten local npm packages, independent license metadata, checked core/provider ownership, source companions, explicit deployment and identical shared-asset deduplication |
| Diagnostics | Missing providers report `DEPLOYMENT_UNAVAILABLE` with required capabilities; qualification, resource-limit and configured-asset failures stay distinct |

The observed fine/common startup intervals overlap. Both browser runs retain the
baseline with `uncertain-difference`. These are selection-path measurements,
not a claim that one packaging variant is faster. CPU and peak-memory cost were
not measured, and policies requiring them preserve the baseline.

## Qualification and scope

The review fixes preserve measured resource-limit exclusions across runtime
availability retries, reject Matroska display dimensions that this mux cannot
preserve (including omitted `DisplayUnit`), and report deployment preparation
failures per asset without unhandled constructor promises. Regression and rebuilt
package evidence is retained in `results/media-components/review-fixes/`.

Evidence lives under `results/media-components/`:

- `component-installed/`: installed TS-only copy, six fine/common repair cases,
  audio signal, video pixels, seek output, missing-provider diagnostics, selective
  Wasm loading and measured selection in Chrome and Firefox.
- `audio-provider/`: packet decode/reference checks, fine/common equivalence,
  FLAC roundtrips, reset/abort and host-decoded repair output.
- `container-provider/`: packet hashes/timestamps, decoded A/V equivalence and
  bounded malformed/cancelled input rejection.
- `runtime-packages/`: private-runtime copy/repair, non-isolated operation,
  explicit unavailable JSPI, deployment-aware auto selection, native without
  engines, independent mpv fallback and pthread preference.
- `provider-completion/`: the existing broad-provider regression matrix,
  including selected audio, preview, YUV/RGB fallback and terminal corrupt assets.
- `local-playground/` and `component-lab/`: the actual local user interfaces.

The packet recipe's browser evidence is AVC without reordered pictures and
48 kHz stereo audio. The reader/mux have HEVC syntax support, but these tests do
not grant HEVC, HDR, DTS-HD, arbitrary Matroska, streaming or large-file admission.
The maintained TS path rejects unsupported lacing, encryption, metadata/timing
features, discontinuities and oversized input/output; broad providers retain
compatibility ownership. Input is capped at 64 MiB and prepared output at 96 MiB.
FLAC24 repair quantizes floating-point decoder output; it is not lossless float.

Native records preserve their actual build provenance, including recovered dirty
builds where applicable. Corresponding source and observed build evidence do not
retroactively claim a clean release build. These are locally audited packages,
not a publication campaign.

## Recheck

```sh
npm run build
npm run test:components
node scripts/setup-component-consumer.mjs
node tests/component-installed.mjs
BROWSER=firefox node tests/component-installed.mjs
node tests/provider-runtime-packages.mjs
BROWSER=firefox node tests/provider-runtime-packages.mjs
```

`test:components` regenerates fixtures, so rerun browser qualification before
using the lab: fixture hashes deliberately invalidate older evidence. Production
admission and Player API remain unchanged by the packet recipes. Promoting those
recipes to automatic Player routing would be a separate policy change, expressly
outside this request's original routing constraint.
