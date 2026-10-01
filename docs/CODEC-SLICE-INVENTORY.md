<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Codec slices: inventory and remaining work

Snapshot: **2026-10-01**, local codec expansion in the `demuxe` checkout. This is
the scoped inventory and backlog for selectable audio providers. It does not enable new plans,
change defaults, or authorize publishing. mpv remains **one atomic provider**;
its unified engine is a local candidate, not a released replacement.

## Scope and counts

- **30 optional slice packages in the current catalog**:23 audio components, one container component and six full-file preparation variants. The retained28 historical audited identities remain historical; Qt and G726 add two current optional targets. A package count is not a codec count or a release qualification.
- **Four broad provider packages**: primary FFmpeg, FFmpeg Asyncify, FFmpeg JSPI and atomic mpv. Together with optional slices, the current catalog has34 providers (plus the separate core package).
- The current P2 gate assembles25 packages: core, container and23 audio packages. Six historical full-file preparation variants and four broad providers are outside this gate. Fresh post-merge atomic mpv/core playback proof is separate. The05 gate remained failed because one worker cleanup failed after86 standard passes; recovered fixtures and corrected runner require a fresh gate.
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
The JSON retains the seven-group checkpoint and separately records newer packet packages, the rebuilt container/FLAC dependencies, and two separately scoped completed installed campaigns. Historical identities retain their historical status; current candidate evidence is
described in [the codec expansion report](CODEC-EXPANSION.md). The
historical unified build record did not hash that configuration; the snapshot
records this limitation rather than claiming source correspondence.

“All slices” should first mean covering the existing **audio-preparation
contract**, then qualified extensions. Covering all upstream FFmpeg codecs would
also require new external dependencies, build/platform checks and API contracts.
It is not the same scope as splitting the codecs already enabled here.

The [provider conformance suite](PROVIDER-TESTING.md) is the standard functional gate for exact provider offers. Every declared offer must be represented; missing suites or retained references remain incomplete. Installed browser playback, package/source audits and release qualification retain separate gates.

## Testing status vocabulary

| Status | Meaning |
| --- | --- |
| Historical qualified | Exact prior package/core identities passed the recorded bounded contracts; not a blanket qualification of this worktree |
| Local smoke passed | Representative fixtures passed in local Chromium; not the full layout/rate/container/browser matrix |
| Installed Chromium passed | Exact frozen package identities passed the stated assets/embedded matrix and required controls; current Firefox, Linux CI and release remain separate |
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

At the seven-group checkpoint, these eight packages implemented the priority groups. Its local browser matrix passed **64 assets/embedded checks plus 12 full-file checks**; none was published or release-qualified. Later finite scope is recorded separately below.
See [contracts, measurements and commands](CODEC-EXPANSION.md).

| Priority | New package suffix | Implemented contract | Current evidence |
| --- | --- | --- | --- |
| P1.1 | `ffmpeg-ac3-eac3-jspi`, `ffmpeg-ac3-eac3-asyncify` | Full-file AC3/EAC3 → FLAC with copied video; existing streaming preparation ABI | Both variants built/audited; 12 local installed browser checks (10 positive, 2 negative), stereo/5.1 and bounded large-file reads |
| P1.2 | `audio-opus-encoder` | Explicitly lossy 48 kHz mono/stereo libopus output; packet delay and final duration | 8 real-Wasm output cases; independent decode and seek with 80 ms preroll |
| P1.3 | `audio-aac` | AAC-LC default; explicit finite HE stereo48, HEv2 stereo44100, USAC mono48 | AAC-LC Matroska/MOV checks in the frozen 762 campaign; explicit extensions passed the 296 campaign, with original priming/padding and finite output policies |
| P1.4 | `audio-opus-vorbis` | Opus/Vorbis packet decoders; stereo 48 kHz maintained composition | Native reference checks; intrinsic pre-skip/overlap handled once |
| P1.5 | `audio-lossless` | FLAC/ALAC integer packet decoders | Native reference checks; FLAC Matroska composition; bounded ALAC MOV conversion passed the exact installed 762 campaign |
| P1.6 | `audio-mp3` | FFmpeg `mp3float` decoder | Native reference checks and stereo 48 kHz Matroska compositions |
| P1.7 | `audio-pcm` | Little-endian s16/s24/s32/f32/f64 packet decoding | Native reference checks; finite precision/range guards; f64 MOV passed the frozen 762 campaign; WAV unsigned8/AIFF signed8 at 44.1/48/96 kHz mono/stereo passed the 296 campaign with exact integer PCM |

The original seven-group checkpoint packet suites record **34 decoder checks**, **8 Opus encoder cases**,
**4 FLAC regression cases**, **6 owner-failure tests**, and **20 composition
checks**, including **3 expected precision rejections**. These counts describe
bounded checks, not codec or browser counts. At that checkpoint, compositions admitted stereo 48 kHz
Matroska with one audio and one non-reordered AVC/HEVC video track. The current
composition fixtures exercise AVC. Additional rates/channels in those checkpoint packet
tests did not expand composition admission; the later finite extensions below have separate evidence.

The new Opus encoder uses pinned **libopus 1.6.1**, with retained BSD terms and a
matching source archive; it does not link FFmpeg's experimental native encoder.
mpv remains atomic. The historical broad FFmpeg component snapshot is unchanged.

Two completed installed Chromium campaigns have distinct artifact scopes:

| Campaign | Exact scope | Evidence |
| --- | --- | --- |
| Frozen expansion: **762 cases** | 16 exact packages; assets/embedded; 528 compositions and 234 packet cases; 114 required precision, 28 explicit profile, four packet-budget and two unsupported-feature rejections; 30 selective Wasm paths; actual muted post-seek control | [Verified report](../results/media-components/codec-expansion/extended-browser.json), [scope and preserved segments](INSTALLED-AUDIO-762-QUALIFICATION.md) |
| Priority cohort: **296 cases** | 13 exact newer packages and 18 bundles; 138 packet, 136 FLAC and 22 Opus cases; six required precision rejections; 22 selective Wasm paths; actual muted post-seek and speech decoded silence/corruption controls | [Verified report](../results/media-components/codec-expansion/priority-browser.json), [scope and preserved segments](INSTALLED-AUDIO-PRIORITY-296-QUALIFICATION.md) |

The campaigns overlap the required baseline. They are not 1,058 unique cases,
not a single current-package matrix, and not Firefox, Linux CI or release
qualification. Earlier 620-case and 18-case WebM evidence retains its historical
identity scope; the hidden WebM preview qualified decoded frames and canvas
changes, not visible compositor callbacks. Default Player routing is unchanged.

MLP supports at most six channels in the pinned FFmpeg implementation; MLP 7.1 is not an implementable slice extension.

## Follow-up transfer sizes

Exact candidate Wasm sizes (bytes; compression measured locally):

| Provider | Raw Wasm | Gzip level 9 | Brotli quality 11 |
| --- | ---: | ---: | ---: |
| Legacy MP1/MP2/WMA v1/v2 | 439,866 | 200,690 | 163,898 |
| APE/WavPack | 278,388 | 131,067 | 111,627 |
| TTA | 247,866 | 115,731 | 99,291 |

The companion module JavaScript is additional. These measurements describe encoded transfer bytes, not startup time or CPU performance. Exact hashes and package sizes are in `results/media-components/codec-expansion/followup-sizes.json`.

## Completed finite follow-ups

These are installed Chromium results for the named campaign artifacts, not broad
admission of every FFmpeg profile, rate, layout or container.

| Family / provider | Completed evidence and finite boundary |
| --- | --- |
| TrueHD/MLP and DTS-HD | The 762 campaign passed maintained lossless rate/layout extensions and historical 48 kHz regressions. Audible original DTS-HD 5.1/7.1 composition ranges passed exact PCM/video, pause, seek and fresh audio. MLP remains at most six channels. |
| Legacy MP1/MP2/WMA v1/v2 | Packet and finite MP2/WMA compositions passed the 762 campaign. MP1 remains its canonical packet-only profile. |
| WMA Pro/Lossless/Voice | Exact advanced WMA package passed the 762 packet campaign, including the codec-specific Voice quality and actual decoded controls; no ASF reader or conversion recipe. |
| APE/WavPack/TTA/TAK | The 762 campaign passed finite standalone/Matroska archive cases and canonical TAK. Canonical APE and TAK profiles remain explicitly bounded; 32-bit precision and unsupported archive modes reject as specified. |
| Canonical Shorten | Native original stream-clock, full-restart seeks, reader/conversion/owner proof and the 296 installed cohort passed. No arbitrary packet restart or broader Shorten profile admission. |
| WAV MS/IMA ADPCM | All **26** native fact-trimmed FLAC conversions and corresponding packet/reader/owner proofs passed; the 296 cohort passed original sample extent, exact PCM and actual playback at 8/16/22.05/32/44.1/48 kHz mono/stereo. |
| Telephony | **16** native conversions and installed 296 cases passed: G711 A-law/mu-law 8/16 kHz mono/stereo and GSM/GSM-MS 8 kHz mono, with original fact clipping and GSM restart/discard policy. |
| AAC explicit extensions | HE stereo48 and HEv2 stereo44100, plus USAC mono48 ISO BMFF → FLAC with exact original priming/tail extent, passed the 296 cohort. AAC-LC remains the default; profiles are explicit aliases in the existing AAC provider. |
| Low-rate FLAC / PCM8 | `low-rate-s24` output and WAV unsigned8/AIFF signed8 `integer-8bit` decoding passed the 296 cohort. Low-rate recipes remain specific to qualified ADPCM/telephony; PCM8 remains 44.1/48/96 kHz mono/stereo → FLAC. |
| Speex / AMR-NB / AMR-WB | Finite FLV Speex wideband mono and AMR mode0 packets passed native and 296 installed speech quality, reset, clocks and actual decoded silence/corruption controls. **Packet-only: no reader or conversion recipe.** |

## Ranked remaining audio work

| Priority | Work | Testing status / boundary |
| --- | --- | --- |
| P0 | Current Firefox/Linux CI and final release qualification | Local Chromium campaigns passed their exact artifacts. Remote current-package Firefox/Linux, combined broad fallback/full FFmpeg/atomic mpv and final release/source sealing remain pending. |
| P2.1 | MOV IMA-QT reader/conversion integration | Four native packet cases, 16 restart/discard seek checks and 104 controls passed. Public MOV reader, conversion and owner integration passed; source/package sealing and installed browser qualification remain pending. |
| P2.2 | G726/G726LE explicit packing and finite container integration | Twelve synthetic native configurations passed exact original-clock proof; explicit raw and WAV conversion, public recipes and owner tests passed. Source/package sealing and installed browser qualification remain pending; official fixture packing remains unqualified. |
| P2.3 | Broaden remaining modes/rates/layouts in existing AAC, speech, lossless and legacy families | [Ranked profile inventory](AUDIO-PROFILE-GAP-INVENTORY.md) tracks seven concrete extensions. AMR ordinary modes have native proof; packaged conformance and installed checks are pending. Remaining tuples require real fixtures, exact framing/gapless clocks and precision/layout controls before broader offers. No additional family package is automatically needed for a profile alias. |
| P3 | Other DPCM/game/proprietary audio and DSD | Follow concrete fixture demand after important container/profile gaps. Inventory presence does not qualify native framing, conversion or playback. |

The existing explicit audio-preparation decoder families now have corresponding
slice implementations, subject to these finite bounds. MP3 uses `mp3float`;
a second integer MP3 implementation does not require another public package.
Opus and FLAC encoding remain distinct from their decoder providers.

## Other component backlog

| Priority | Work | Testing status / boundary |
| --- | --- | --- |
| P1 | Declarative codec-family build/package matrix instead of adding string-replacement recipes for every family | FFmpeg packet family map, dedicated libopus recipe and three full-file families implemented; generalized policy/qualification matrix remains |
| P1 | Per-family fixture manifest and automated installed-package matrix | Native expansion suites and local installed assets/embedded browser matrix passed; remote automation remains |
| P2 | Additional container slices: MOV/MP4, WebM/Ogg, MPEG-TS, WAV/AIFF | Bounded MOV/MP4, Ogg, WAV/AIFF, standalone APE/WavPack and WebM copy implemented with native proofs; finite MOV/Ogg/WAV/AIFF and archive conversions passed their scoped installed campaigns. MPEG-TS remains explicit packet-only. One container per codec is unnecessary |
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
| Unified mpv source correspondence | P0 before shipping unified mpv | Isolated source/package audit and byte-identical retained-input relink passed; clean dependency rebuild remains pending. See [source gate](UNIFIED-MPV-SOURCE-GATE.md) |
| Unified mpv production assembly | P0 before shipping unified mpv | Integrate the one-engine layout into ordinary release packaging, regenerate audited manifests and qualify the exact resulting packages |
| Current combined browser matrix | P0 before shipping changed bundles | Rerun slice/broad fallback combinations on latest core plus unified mpv; remote Chromium/Firefox native qualification pending |
| Publication/staging | After qualification | No release upload/npm publication or change to default delivery authorized by this inventory |

A merge of the candidate tooling/backlog can keep these shipping gates open.
A merge described as “production-ready unified mpv” cannot. This expansion has not been committed, pushed, tagged or published. Historical
provider architecture merges do not qualify these new candidate bytes.

## Current priority campaign

See [expanded audio evidence](AUDIO-COVERAGE-EXPANSION.md), [container backlog](CONTAINER-CODEC-NEXT.md), and [exact CI input workflow](CODEC-EXPANSION-CI.md). These updates preserve the original committed results and do not promote the production qualification registry. mpv remains atomic.

### Current finite extensions

HE-AAC stereo48, HEv2 stereo44100 and USAC mono48 use explicit profile admission in the existing AAC slice; AAC-LC stays the default. Their maintained native/converter/owner proofs and exact 296-case installed cohort passed. Low-rate FLAC output (8/16/22.05/32 kHz mono/stereo) has a distinct `low-rate-s24` offer and passed qualified ADPCM/telephony compositions in that cohort. Profiles and packet families do not broaden default Player routing or imply all-FFmpeg codec support.

## Current P2 qualification checkpoint

The standard provider conformance runner is the functional gate for every finite declared offer. Current recovery binds exact historical data or newly generated data with fresh native/reference/reset/seek proof. Fresh 25-package assembly/audit, standard conformance and installed assets/embedded playback must finish before the current P2 scope can be marked passed. The 762-case and 296-case campaigns retain their original frozen identities; they do not qualify this new cohort.

The scope is selectable public component providers. It does not claim every configuration of every FFmpeg decoder, automatic admission of all families to the default Player, or a production release. Atomic mpv/core merge qualification and public Player playback remain separate.
