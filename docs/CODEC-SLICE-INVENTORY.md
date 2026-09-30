<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Codec slices: inventory and remaining work

Snapshot: **2026-09-30**, local codec expansion in the `demuxe` checkout. This is
the scoped inventory and backlog for selectable audio providers. It does not enable new plans,
change defaults, or authorize publishing. mpv remains **one atomic provider**;
its unified engine is a local candidate, not a released replacement.

## Scope and counts

- **19 optional slice packages**: 12 audio components, one container component,
  and six full-file preparation variants. Eight local candidates extend the
  historical 11 packages; these are not 19 distinct codecs.
- **Four broad provider packages**: primary FFmpeg, FFmpeg Asyncify, FFmpeg JSPI,
  and mpv. Together with slices, the package inventory has 23 providers.
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
hashes, the explicit audio configure set, and the historical 11 package identities.
The JSON also records eight new packages and the rebuilt container/FLAC dependencies. Historical identities retain their historical status; current candidate evidence is
described in [the codec expansion report](CODEC-EXPANSION.md). The
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
| Native candidate passed | Exact local native builds passed the stated packet/output tests; browser and release gates remain separate |
| Local candidate passed | Current unified mpv candidate passed its scoped tests; source/release/remote gates remain |
| Build profile only | Script accepts the family; no qualified installed slice is claimed |
| Not split / untested | No maintained dedicated provider or dedicated slice qualification in this inventory |

## Historical 11 slices

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

## Seven priority groups implemented locally

These eight packages implement the seven priority groups. The local browser matrix passed **64 assets/embedded checks plus 12 full-file checks**; none is published or release-qualified.
See [contracts, measurements and commands](CODEC-EXPANSION.md).

| Priority | New package suffix | Implemented contract | Current evidence |
| --- | --- | --- | --- |
| P1.1 | `ffmpeg-ac3-eac3-jspi`, `ffmpeg-ac3-eac3-asyncify` | Full-file AC3/EAC3 → FLAC with copied video; existing streaming preparation ABI | Both variants built/audited; 12 local installed browser checks (10 positive, 2 negative), stereo/5.1 and bounded large-file reads |
| P1.2 | `audio-opus-encoder` | Explicitly lossy 48 kHz mono/stereo libopus output; packet delay and final duration | 8 real-Wasm output cases; independent decode and seek with 80 ms preroll |
| P1.3 | `audio-aac` | AAC-LC packet decoder; stereo 48 kHz maintained composition | Native reference checks; Matroska → FLAC/Opus composition checks |
| P1.4 | `audio-opus-vorbis` | Opus/Vorbis packet decoders; stereo 48 kHz maintained composition | Native reference checks; intrinsic pre-skip/overlap handled once |
| P1.5 | `audio-lossless` | FLAC/ALAC integer packet decoders | Native reference checks; FLAC Matroska composition; ALAC MOV is packet-fixture coverage only |
| P1.6 | `audio-mp3` | FFmpeg `mp3float` decoder | Native reference checks and stereo 48 kHz Matroska compositions |
| P1.7 | `audio-pcm` | Little-endian s16/s24/s32/f32/f64 packet decoding | Native reference checks; finite precision/range guards; f64 MOV is packet-fixture coverage only |

The packet family suites record **34 decoder checks**, **8 Opus encoder cases**,
**4 FLAC regression cases**, **6 owner-failure tests**, and **20 composition
checks**, including **3 expected precision rejections**. These counts describe
bounded checks, not codec or browser counts. New compositions admit stereo 48 kHz
Matroska with one audio and one non-reordered AVC/HEVC video track. The current
composition fixtures exercise AVC. Additional rates/channels covered by packet
tests do not expand that composition admission.

The new Opus encoder uses pinned **libopus 1.6.1**, with retained BSD terms and a
matching source archive; it does not link FFmpeg's experimental native encoder.
mpv remains atomic. The historical broad FFmpeg component snapshot is unchanged.

## Ranked remaining audio work

| Priority | Work | Testing status / boundary |
| --- | --- | --- |
| P1 | Broaden installed browser qualification across supported browsers | Local Chromium assets/embedded and AC3 JSPI/Asyncify passed; current Firefox and combined broad-fallback qualification remain |
| P1 | Extend current families across rates, channels, containers, priming/gapless and real-world fixtures | Only the finite contracts above are admitted; ALAC/f64 packet tests do not add a MOV demux provider |
| P2.1 | Existing lossless extensions: MLP 7.1, DTS-HD stereo/5.1, further rates/layouts | Existing finite matrix remains historical; extensions unqualified |
| P2.2 | Legacy audio: `mp1,mp2,wmav1,wmav2,wmapro,wmalossless` | Broad mpv FFmpeg includes these; no dedicated conversion slices or qualification |
| P2.3 | Archival lossless: `ape,wavpack,tta,tak,shorten` | Broad mpv FFmpeg includes these; grouping, lossless comparisons and seeking remain |
| P3 | Speech, ADPCM/DPCM, DSD, game/proprietary audio | Inventory only; prioritize using input demand and representative fixtures |

The existing explicit audio-preparation decoder families now have corresponding
slice implementations, subject to these finite bounds. MP3 uses `mp3float`;
a second integer MP3 implementation does not require another public package.
Opus and FLAC encoding remain distinct from their decoder providers.

## Other component backlog

| Priority | Work | Testing status / boundary |
| --- | --- | --- |
| P1 | Declarative codec-family build/package matrix instead of adding string-replacement recipes for every family | FFmpeg packet family map, dedicated libopus recipe and three full-file families implemented; generalized policy/qualification matrix remains |
| P1 | Per-family fixture manifest and automated installed-package matrix | Native expansion suites and local installed assets/embedded browser matrix passed; remote automation remains |
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
The first seven groups now have local implementations, scoped native evidence and installed-browser checks;
this inventory does not itself prove a green merge
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
A merge described as “production-ready unified mpv” cannot. This expansion has not been committed, pushed, tagged or published. Historical
provider architecture merges do not qualify these new candidate bytes.
