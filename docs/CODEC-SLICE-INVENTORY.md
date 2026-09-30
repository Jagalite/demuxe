<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Codec slices: inventory and remaining work

Snapshot: **2026-09-30**, `modular-media-providers` worktree. This is the scoped
backlog for expanding selectable FFmpeg providers. It does not enable new plans,
change defaults, or authorize publishing. mpv remains **one atomic provider**;
its unified engine is a local candidate, not a released replacement.

## Scope and counts

- **11 optional slice packages**: six audio components, one container component,
  and four full-file preparation variants. These are not 11 distinct codecs.
- **Four broad provider packages**: primary FFmpeg, FFmpeg Asyncify, FFmpeg JSPI,
  and mpv. Together with slices, the installed inventory has 15 providers.
- Broad audio preparation explicitly requests **17 decoder implementations and
  two encoders**. MP3 has two implementations; DTS core/HD share FFmpeg `dca`.
- The local broad FFmpeg configuration used as the dependency location for mpv
  enables **500 decoders, 357 demuxers, zero encoders and zero muxers**. This
  includes video, audio, subtitles, images, variants and utility entries. It is
  neither 500 independently qualified codecs nor a proposal for 500 packages.
- Remux/packet copy does not require a decoder slice when the target container
  and browser accept the original codec. Audio conversion needs decoding,
  encoding and container support; adding a decoder alone does not add a route.

[Machine-readable inventory](codec-slice-inventory.json) retains every enabled
component name from that broad configuration, its hash, the actual linked archive
hashes, the explicit audio configure set, and all 11 package identities. The
historical unified build record did not hash that configuration; the snapshot
records this limitation rather than claiming source correspondence.

“All slices” should first mean covering the existing **audio-preparation
contract**, then qualified extensions. Covering all upstream FFmpeg codecs would
also require new external dependencies, build/platform checks and API contracts.
It is not the same scope as splitting the codecs already enabled here.

## Testing status vocabulary

| Status | Meaning |
| --- | --- |
| Historical qualified | Exact prior package/core identities passed the recorded bounded contracts; not a blanket qualification of this worktree |
| Local smoke passed | Representative fixtures passed in local Chromium; not the full layout/rate/container/browser matrix |
| Local candidate passed | Current unified mpv candidate passed its scoped tests; source/release/remote gates remain |
| Build profile only | Script accepts the family; no qualified installed slice is claimed |
| Not split / untested | No maintained dedicated provider or dedicated slice qualification in this inventory |

## Existing slices

Package names below use the prefix `@demuxe/provider-`. Priority is maintenance
priority, not a claim that another slice must ship before merging the backlog.

| Package suffix | Function | Priority | Testing status and bounds |
| --- | --- | --- | --- |
| `audio-ac3` | AC3 + EAC3 packet decoding | P1 | Historical installed Chrome/Firefox legacy checks; local bundle smoke for both codecs |
| `audio-dts` | DTS core packet decoding | P1 | Historical installed legacy checks; local bundle smoke; does not qualify HD |
| `audio-flac` | FLAC encoding, **not FLAC decoding** | P1 | Historical installed/channel-output tests; exercised as dependency of packet compositions |
| `audio-common` | AC3/EAC3/DTS core decode + FLAC encode | P1 | Historical installed legacy checks; local combined-provider smoke |
| `audio-truehd-mlp` | TrueHD/MLP packet decoding | P1 | Historical 48 kHz: TrueHD stereo/5.1/7.1; MLP stereo/5.1; local representative smoke |
| `audio-dts-hd` | Full DTS-HD decoding | P1 | Historical 48 kHz DTS-HD MA canonical 7.1; local representative smoke |
| `container` | TypeScript Matroska input / fragmented MP4 output | P1 | Historical bounded composition tests; local copy and audio composition smoke; no-reordering AVC, one audio/video track, constrained blocks/timestamps |
| `ffmpeg-truehd-mlp-asyncify` | Full-file TrueHD/MLP → FLAC24 with copied video | P1 | Historical Chrome + Firefox Asyncify qualification; local bundle smoke |
| `ffmpeg-truehd-mlp-jspi` | Same family, JSPI runtime | P1 | Historical Chrome JSPI qualification; local bundle smoke; Firefox JSPI absence is a capability rejection |
| `ffmpeg-dts-hd-asyncify` | Full-file DTS-HD → FLAC24 with copied video | P1 | Historical Chrome + Firefox Asyncify qualification; local bundle smoke |
| `ffmpeg-dts-hd-jspi` | Same family, JSPI runtime | P1 | Historical Chrome JSPI qualification; local bundle smoke; no Firefox JSPI claim |

The packet Blob convenience path has a 64 MiB input / 96 MiB output limit; its
fragment API delegates MSE append/eviction/seek ownership to the consumer. The
full-file variants retain the streaming worker/seek implementation and broader
AVC/HEVC input contract. See [exact contracts](CODEC-SPLIT-PRODUCTION.md).

### Evidence boundaries

- The historical production qualification records **29 gates / 11 archives** in
  `build/codec-preparation/production-qualification-review-02.json`, with immutable
  reports under `results/media-components/production-preparation/qualified-0a5563749a84-74b25cb8a60f/`.
  Its core SHA256 is `0a5563749a84a1fb36346a36f47fb5c2854f483c46a7ab5a3516268ece6d529c`.
- [Quick split report](../results/media-components/bundling/quick-splits.json):
  **32 checks / 16 bundles**, assets and embedded, local Chromium. FLAC and
  container dependencies are tested in compositions, not as independent playback
  engines. This is not the complete channel matrix or current Firefox coverage.
- [Unified mpv review report](../results/media-components/bundling/unified-mpv-review.json):
  **8 cases**, four modes × two delivery formats; pause/resume, target arrival,
  progression, nonzero audio before/after seeks, and embedded cleanup. Three
  negative evidence checks reject ignored seeks, silence and stopped clocks.
  Its nine image comparisons are historical diagnostics from the earlier bundle.
- The complete slice matrix has **not** been rerun against the latest unified
  mpv candidate. Old qualification is not transferred to new core/native bytes.

## Ranked remaining audio work

Suggested order reflects browser compatibility gaps and reuse of the existing
conversion pipeline. These are engineering priorities, not measured user demand.
Every new row needs a maintained recipe and installed-package tests before
admission. “In broad build” is build evidence, not a qualified conversion promise.

| Priority / order | Family and FFmpeg identifiers | Existing coverage | What remains | Dedicated slice testing |
| --- | --- | --- | --- | --- |
| P1.1 | AC3/EAC3: `ac3,eac3` | Packet slice; broad preparation; `ac3-eac3` full-file build profile exists | Package and qualify Asyncify/JSPI full-file variants for reordered video, larger files and seeking | Packet smoke/historical passed; full-file slice profile only |
| P1.2 | Opus output encoder: `opus` | Broad build enables encoder; no dedicated encoder slice | Define supported output/container policy, delay/pre-skip and seek behavior; qualify compatibility alternative to FLAC | No dedicated slice; broad configuration is not output qualification |
| P1.3 | AAC: `aac` | Broad preparation; browser/native paths when supported | Decoder slice, config/extradata, priming/gapless, selected tracks; FLAC/Opus output contract | Not split / untested |
| P1.4 | Opus + Vorbis input: `opus,vorbis` | Broad preparation | Decoder family or separate slices; codec delay, seek preroll, extradata, Ogg/WebM/Matroska fixtures | Not split / untested |
| P1.5 | FLAC + ALAC input: `flac,alac` | Broad preparation; existing FLAC slice is encoder only | Lossless input slice, integer PCM/channel identity and high bit depth/rate matrix | Not split / untested |
| P1.6 | MP3: `mp3,mp3float` | Broad preparation | Choose implementation(s), VBR, reservoir, encoder delay/end padding and seek tests | Not split / untested |
| P1.7 | PCM: `pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le,pcm_f64le` | Broad preparation | One sensible PCM family; sample conversion, clipping, endianness, layouts and container metadata | Not split / untested |
| P2.1 | Existing lossless contract extensions | TrueHD/MLP/DTS-HD slices exist | Qualify MLP 7.1, DTS-HD stereo/5.1, additional rates/layouts only when supported; retain rejection until passed | Current finite matrix passed historically; extensions pending |
| P2.2 | Other common legacy audio: `mp1,mp2,wmav1,wmav2,wmapro,wmalossless` | Enabled in broad mpv FFmpeg, not the explicit audio-preparation decoder list | Add conversion recipe/demux support and fixtures before slicing | No dedicated slices / untested |
| P2.3 | Archival lossless: `ape,wavpack,tta,tak,shorten` | Enabled in broad mpv FFmpeg | Decoder grouping, lossless comparisons, seek and corrupt-input bounds | No dedicated slices / untested |
| P3 | Remaining speech, ADPCM/DPCM, DSD, game/proprietary audio | See complete enabled-component JSON | Rank by actual input demand and fixture availability; many require new preparation contracts | No dedicated slices claimed |

The 17 explicitly requested preparation decoders are all accounted for in the
first seven rows or existing TrueHD/MLP/DTS slices. Distinct implementations do
not necessarily deserve separate npm packages. Opus **decoding** and Opus
**encoding** are separate deliverables; FLAC follows the same distinction.

## Other component backlog

| Priority | Work | Testing status / boundary |
| --- | --- | --- |
| P1 | Declarative codec-family build/package matrix instead of adding string-replacement recipes for every family | Current scripts support six packet profiles and three full-file profiles; generalized generator pending |
| P1 | Per-family fixture manifest and automated installed-package matrix | Existing suites cover named finite families; extension fixtures and latest combined rerun pending |
| P2 | Additional container slices: MOV/MP4, WebM/Ogg, MPEG-TS, WAV/AIFF | Broad FFmpeg contains demux support; only the bounded TypeScript Matroska→fMP4 component is separately maintained. One container per codec is unnecessary |
| P2 | Subtitle formats | Remain behind the existing mpv service; no new standalone subtitle splits proposed or qualified |
| P3 | Standalone video decoder providers (H264/HEVC, VP8/VP9/AV1 first if demanded) | mpv broad decoder build and browser routes already serve their existing contracts. Independent providers need a new frame/presenter integration and tests; audio slice infrastructure alone does not supply it |
| P3 | Remaining image/video/subtitle/demux entries in the 500-decoder snapshot | Inventory only; not individual promised packages or qualified browser playback routes |
| Out of current scope | Every upstream codec, hardware-specific implementation, additional external libraries, video encoding | Requires a separate scope/dependency/license/platform audit; not covered by current enabled-component counts |

## Acceptance checklist for each new family

1. Pin source/toolchain, inspect effective enabled decoder/encoder sets, capture
   dependency closure, reproducible build inputs, licenses and matching source.
2. Register an explicit provider profile and maintained finite recipe; define
   containers, rates, channel layouts, bit depths, size limits and fallbacks.
3. Compare decoded/output PCM and channel positions with a reference; cover
   priming/padding, timestamps/discontinuities and copied-video correctness.
4. Exercise original files, forward/backward seek arrival and progression,
   post-seek audio, pause/resume, EOF, alternate tracks, cancellation and reopen.
5. Test missing/corrupt assets, unsupported layout/rate rejection and resource
   bounds. Retain failed cases; do not silently broaden automatic admission.
6. Test installed packages in both delivery formats; Chrome JSPI/Asyncify and
   Firefox Asyncify where relevant. Check disposal, concurrent instances and
   compatibility with broad fallback providers.
7. Bind reports to exact bundles, fixtures, source and package identities;
   measure raw/compressed size. CPU/memory claims need separate measurements.

## Merge scope and shipping gates

**The future slice backlog is not a requirement to merge the existing finite
implementation.** New families remain unadvertised and unadmitted until tested.
This inventory closes the planning task; it does not itself prove a green merge
or turn local candidates into production-qualified packages.

| Gate | Priority | Current state / action |
| --- | --- | --- |
| Current branch review and CI | P0 before merge | Local scoped checks passed; remote exact-head status not verified in this inventory. Confirm required checks before merging |
| Native bundle CI inputs | P0 for a green native workflow | `.github/workflows/bundler.yml` requires `BUNDLE_NATIVE_TAG` and `BUNDLE_NATIVE_INVENTORY_SHA256` (or dispatch inputs). No completed remote run recorded here; pin matching packages/fixtures and run it |
| Keep candidate behavior isolated | P0 before merge | Unified packaging clones private test packages and does not update production registry/default configuration; retain that boundary |
| Unified mpv source correspondence | P0 before shipping unified mpv | Source companion explicitly pending; record complete build input/dependency closure and assemble/verify matching source archive |
| Unified mpv production assembly | P0 before shipping unified mpv | Integrate the one-engine layout into ordinary release packaging, regenerate audited manifests and qualify the exact resulting packages |
| Current combined browser matrix | P0 before shipping changed bundles | Rerun slice/broad fallback combinations on latest core plus unified mpv; remote Chromium/Firefox native qualification pending |
| Publication/staging | After qualification | No release upload/npm publication or change to default delivery authorized by this inventory |

A merge of the candidate tooling/backlog can keep these shipping gates open.
A merge described as “production-ready unified mpv” cannot. No merge, commit,
push, tag or publication was performed as part of preparing this document.
