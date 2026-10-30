<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# MediaBunny optional provider audit

Audit date: **2026-10-29**. Audited upstream: **MediaBunny 1.63.0**, npm metadata Git revision `0f80f47e617b576737ffd4ce39a626eb7c7e934e`. Demuxe reference HEAD: `9702315e7aac272c718cd14ae190b8b37b7a3140`; the evidence record hashes the inspected working files rather than assuming the entire checkout is clean.

**Keep FFmpeg and mpv as maintained backups. Add MediaBunny selectively where it can supply a qualified browser-oriented component.** Its strongest candidates are common-container inspection, packet access, browser-preparation muxing and previews. Its codec wrappers, optional Wasm codecs and conversion APIs offer additional possibilities, but must not take over Demuxe's admission, fidelity, transport or lifecycle policy.

This is a source and package audit, not a new playback qualification or performance benchmark. The core and seven published extension archives were downloaded without installation or lifecycle scripts; all eight npm integrity values were verified. Source and shipped-bundle hashes, compression measurements and evidence boundaries are retained in [the audit record](mediabunny-provider-audit-20261029.json). The [coverage view](mediabunny-provider-audit-20261029.html) summarizes adoption candidates. No runtime implementation, package dependency or routing default was changed.

## Decision summary

| Area | What MediaBunny contributes | Potential Demuxe use | Decision |
| --- | --- | --- | --- |
| Inspection and metadata | Format recognition, tracks, configuration, duration, tags, cover art and attachments | Additional bounded inspection provider | Prioritize; retain partial-fact and FFmpeg inspection fallback |
| Common-container demux | JS parsers and encoded packet access | Input side of qualified native preparation and existing codec compositions | Prioritize for exact container/profile envelopes |
| Mux and packet-copy remux | MP4/fMP4, WebM and other output writers | Alternative `media.prepare.file` binding with browser A/V presentation | Prioritize; implement a segment producer and preserve timestamps/tracks |
| Previews and scrubbing | Frame/sample sinks and sparse timestamp access | Optional `PreviewProvider` | Prioritize independently of full playback |
| Browser codec access | WebCodecs configuration, queues, sample ownership and codec checks | Selected decode/encode bindings | Useful; native-first selection must remain outside global registrations |
| Existing Demuxe codec slices | Custom encoder/decoder API for recognized codec IDs | Adapter around selected AC-3/E-AC-3/DTS/FLAC and other overlapping slices | Investigate; not a generic bridge for every current codec |
| Specialty codec extensions | FFmpeg audio slices, libFLAC, LAME and TurboRes | Optional alternative providers, especially ProRes | Compare against existing slices; no automatic replacement |
| Audio conversion | PCM adapters, mixing and resampling | Explicit preview/export or qualified processing | Guard precision/layout; do not substitute for existing lossless contracts |
| Subtitle handling | WebVTT output; general metadata/attachment access | Export of supplied captions; attachment discovery | Retain existing extraction/rendering services |
| HLS | Playlist/segment input and output, VOD/live tracks and clear-key decryption | Inspection, packet extraction, recording/export experiments | Keep Shaka/native playback ownership initially |
| DASH and commercial DRM playback | No corresponding DASH/CDM playback implementation in the audited core | None as a direct replacement | Retain Shaka/EME |
| Full playback policy | Data/codec facilities rather than a Demuxe-equivalent player | Components under existing player/session owners | Keep Demuxe routing, clocks, track selection, verification and fallback |

“Native” in the current route names describes presentation ownership. Several native preparation plans still use FFmpeg. MediaBunny would be another implementation behind those responsibilities, not a reason to remove the existing implementations. See [current plan ownership](../src/internal/machine/playback-plans.ts) and [provider recipes](../src/internal/execution-recipes.ts).

## Container coverage

The following is implementation coverage, not an assertion that every variant, codec combination or malformed input works. The authoritative enumerations are the pinned [input formats][input-formats], [output formats][output-formats] and individual demuxers/muxers. Container support and decoder availability are independent.

| Format family | Read and write | Useful applications and important bounds |
| --- | --- | --- |
| ISO BMFF: MP4/M4A and QuickTime MOV | Both, including fragmented MP4/CMAF machinery | Probe, selected-track packet copy, native MSE preparation, export. Multiple substantive edit-list entries are simplified to the first; exact edit/timeline admission needs a guard. MOV support does not add ALAC to the codec registry. |
| Matroska/MKV and WebM | Both | Common-file packets, tags/attachments and WebM output. Unsupported ContentEncoding can cause a track to be skipped. Subtitle input is not exposed as a supported subtitle track. |
| Ogg | Both | Opus/Vorbis/FLAC paths according to format mapping. Do not infer support for Speex, arbitrary chaining or every Ogg mapping merely from Ogg support. |
| WAVE | Both; input recognizes RIFF, RIFX and RF64 | PCM and G.711. The audited WAVE decoder mapping does not cover our WAV ADPCM/GSM families. Extensible valid-bit count and speaker mask are skipped by the reader. |
| MP3 elementary files | Both | Metadata, packets, audio extraction/export. Not a claim of MP1/MP2 support. |
| ADTS AAC | Both | AAC stream parsing and serialization; decoder support remains profile/browser dependent. |
| FLAC elementary files | Both | FLAC metadata and packets; browser/custom decoding and separate encoding capability. |
| MPEG transport stream | Both | Common AVC/HEVC and supported audio packet extraction or TS output. The reader explicitly rejects more than one program; expected PTS absence also rejects. |
| HLS playlists and segments | Both | VOD/live input, rendition pairability and segmented output. Separate streaming-policy and encryption boundaries below. |

AIFF/AIFC, ASF, AVI, MPEG-PS/VOB, MXF, standalone APE/WavPack/TTA/TAK/Shorten, raw AMR/G726 and DASH are not input-format providers in the audited registry. Existing Demuxe TS readers and FFmpeg remain useful for these. A codec carried inside a recognized container may still be unknown to MediaBunny.

Source details that matter to admission:

- [ISO BMFF edit processing][iso-edits] warns on multiple edit lists and uses only the first supported substantive edit. A successful parse is not proof that the authored timeline was preserved.
- [Matroska ContentEncoding handling][mkv-encoding] can skip a track. The adapter must compare the selected/required track set with the produced track set and reject an incomplete result.
- [WAVE extensible handling][wave-fields] skips valid bits and channel mask. Demuxe needs independent facts or a narrower profile before claiming exact PCM precision and speaker positions.
- The [MPEG-TS parser][ts-parser] accepts a single program. Broadcast-style multi-program streams belong outside initial admission.
- Matroska CodecDelay is handled, but the audited source search did not find DiscardPadding handling in the reader or source-derived SeekPreRoll handling there. Codec-derived preroll exists. This is a gapless/tail/seek qualification requirement, not an executed failure claim.

## Inspection, packets, sources and targets

`Input` and `InputTrack` expose tracks, codec identifiers/configuration, names, language/dispositions, dimensions, rotation, duration and other metadata. `getMetadataTags()` can return descriptive tags, images and raw attached files. Metadata parsing could avoid a broad engine download on suitable inputs. Preserve the distinction between metadata duration and duration computed by scanning packets. There is no equivalent complete chapter or subtitle-input interface in the audited normalized model. Sources: [Input][input], [tracks][tracks], [metadata][metadata].

`EncodedPacketSink` provides packet iteration, timestamp lookup and key-packet access. `EncodedPacket` holds data, presentation timestamp, duration, key/delta type, sequence ordering and limited side data. It has no public original DTS field. The MP4 writer constructs decode timestamps using its ordering/timestamp logic; packet preservation therefore does not mean byte-identical container timing. Test B-frame ordering, negative starts and authored presentation separately. Sources: [packet representation][packet], [MP4 timing][mp4-timing], [sinks][sinks].

Unknown audio/video codec identifiers can remain visible with an internal container codec ID and raw packet access. This is useful for diagnostics and potentially a custom bridge. It does not provide a ready generic codec adapter: decoder configuration and codec-derived preroll can be absent, and required container CodecPrivate data is not a universal public escape hatch. TrueHD/MLP and other unsupported IDs need targeted API/source work or our existing readers, rather than just registering a decoder.

The source abstractions cover buffers, Blob/File, URL/range reads, readable streams, custom random-access reads and pathed resources; Node-specific file facilities also exist. Targets cover memory buffers, writable streams, append-only streams, custom callbacks, multiple output paths and Node files. They are useful building blocks for streaming, but not interchangeable resource guarantees. `BufferTarget` retains the output; finite source caches and seek needs still constrain forward-only streams. Sources: [source implementation][source], [target implementation][target].

Fragmented MP4 has initialization/media-box callbacks and minimum fragment-duration controls; writable targets can propagate backpressure. These are credible primitives for a new MSE segment producer, not an MSE scheduler. Explicitly select fragmented output and streaming targets: whole-buffer defaults can retain an entire output, and enabled chunked `StreamTarget` defaults to 16 MiB chunks. Packet iteration also prefetches based on observed consumption rather than enforcing our desired byte ceiling. Add latency/queue limits in the owning adapter. Sources: [fragment options][output-formats], [stream targets][target], [packet iteration][sinks].

For remote Demuxe playback, use **CustomSource backed by Demuxe's existing transport**. URL source defaults include a 64 MiB cache, two concurrent requests and unlimited retries. The ordinary URL loader can accept non-range responses and proceed sequentially; backward reads may become impossible once needed bytes are evicted. Request options/custom fetch exist, but do not establish our authorization-refresh, source-identity and deadline contract. Its public request-init options exclude a caller signal; input/source disposal and our own cancellation adapter must be coordinated. See [URL options][url-options] and [range fallback][url-fallback].

Demuxe's inspected source defaults are 512 KiB, 32 reads and 10 seconds; missing metadata remains incomplete evidence, while transport failures retain their original classification. Its remote reader also checks response ranges, stable length, identity encoding and an ETag/immutable-source contract. Preserve these through the adapter rather than replacing them with library defaults. Sources: [inspection](../src/sources.ts), [range authority](../src/internal/machine/range-reader.ts), [range effects](../web/range-reader.js).

## Codec and extension coverage

The pinned [codec registry][codecs] contains **29 identifiers**: six video, eight compressed audio, fourteen PCM/G.711 and one subtitle. This is a vocabulary count, not a count of universally available decoders or qualified playback profiles.

| Class | Identifiers | Implementation/availability |
| --- | --- | --- |
| Video | AVC/H.264, HEVC/H.265, VP8, VP9, AV1, ProRes | Browser WebCodecs for admitted configurations, or registered custom implementations; ProRes has a separate TurboRes extension |
| Compressed audio | AAC, Opus, MP3, Vorbis, FLAC, AC-3, E-AC-3, DTS | Browser support varies; optional custom implementations fill specific gaps |
| PCM/G.711 | u8, s8; s16/s24/s32/f32/f64 in both endiannesses; A-law and mu-law | Built-in JS coders, subject to sample representation limits below |
| Subtitles | WebVTT | Supplied text can be parsed and written; this is not general subtitle input/rendering |

ALAC, TrueHD/MLP, WMA, APE/WavPack/TTA/TAK/Shorten, AMR/Speex, ADPCM/G726 and DSD are absent from that registry. Our slice coverage is broader in these areas. DTS being present does not establish our exact DTS-HD MA, channel-layout or integer-precision profiles.

All seven official extension npm packages inspected here are version 1.63.0 and identify the same Git revision as core:

| Extension | Provides | Implementation | Potential use and boundary |
| --- | --- | --- | --- |
| `@mediabunny/ac3` | AC-3/E-AC-3 decode and encode | FFmpeg `libavcodec`/`libavutil` Wasm | Alternative audio provider; overlaps existing slices. It remains FFmpeg, not a browser-native codec. |
| `@mediabunny/dts` | DTS decode and encode | FFmpeg `dca` Wasm | Alternative provider; compare complete DTS-HD/layout/precision contracts before substitution. |
| `@mediabunny/aac-encoder` | AAC-LC encoding | FFmpeg Wasm | Explicitly lossy export/adaptation when browser encoding is unavailable; not another AAC decoder. |
| `@mediabunny/mp3-encoder` | MP3 encoding | LAME Wasm | Export/conversion capability; not needed for ordinary MP3 playback. |
| `@mediabunny/flac-encoder` | FLAC encoding | libFLAC Wasm | Candidate encoding provider, but selects 16/24-bit output rather than preserving arbitrary 32-bit/f64 input. |
| `@mediabunny/prores` | ProRes decoding | TurboRes Wasm | Useful independent software-decoder candidate; not native WebCodecs. Preserve profile/alpha/color/seek constraints. |
| `@mediabunny/server` | Server decode/encode and transformations | NodeAV/FFmpeg plus ProRes dependency | Possible Node tooling/export use; not a browser fallback or evidence of browser codec availability. |

Sources: pinned extension [AC-3][ac3], [DTS][dts], [AAC][aac], [MP3][mp3], [FLAC][flac], [ProRes][prores], [server][server]. The ProRes ESM package declares `turbores:^1.2.4`; server declares `node-av:^6.0.0` and `@mediabunny/prores:^1.63.0`. Those transitive ranges are not a newly qualified locked native closure.

### Native-first selection and our slices

The custom coder interfaces accept encoded packets or decoded samples and expose `supports/init/decode-or-encode/flush/close`. They can adapt existing Demuxe implementations for codec IDs both projects recognize. They do not add new codec IDs to MediaBunny's closed registry. Sources: [custom coder interfaces][custom], [decode validation][decode].

**Registered custom coders take precedence over WebCodecs.** Registrations live in module-global ordered arrays without a public unregister operation. Capability helpers also include registered custom coders. Eagerly registering all fallback extensions would therefore defeat the desired native-first policy and contaminate a browser-only capability check. Select/acquire a binding first; use controlled worker/module lifetimes or a Demuxe-owned packet-to-decoder bridge. Sources: [registration][custom], [video selection][video-selection], [audio selection][audio-selection].

The AC-3/DTS extensions share a worker within their module. In a browser window the worker is normally kept after its final reference is released; closing one decoder is not necessarily worker retirement. Worker errors are latched and pending requests rejected. Integration needs explicit ownership, reuse and disposal semantics, especially with multiple players. See [worker lifetime][worker-lifetime].

## Samples, fidelity and conversion

`VideoSampleSink`, `AudioSampleSink`, `CanvasSink` and `AudioBufferSink` provide useful decoded access for thumbnails, scrubbing, waveform/analysis consumers and export. Sparse frame requests, codec-aware preroll, decode queues and sample disposal are implemented. These do not constitute a complete playback clock, MSE scheduler, audio output scheduler or Demuxe session. Returned samples/frames must be closed, stale generations rejected and background preview decoding coordinated with playback. Sources: [sinks][sinks], [sample ownership][samples].

The following are material reasons to prefer low-level packet APIs for the first playback binding:

| Finding in 1.63.0 | Demuxe implication |
| --- | --- |
| Default `Conversion` prefers copying but may transcode; forced-copy can discard uncopiable tracks. A conversion can be valid after tracks are discarded. | `isValid` is not preservation proof. Check exact selected tracks and actual outputs; initially use explicit packet sources/sinks. |
| Audio conversion may fall back to stereo 48 kHz if the original channel/rate configuration cannot be encoded. | No implicit rate/layout changes under our ordinary playback or lossless policy. |
| Default trim starts at least at zero; packet-copy trimming may expand to packet/keyframe boundaries. | Preserve authored offsets, preroll and requested trim semantics explicitly. |
| Conversion defaults to discarding alpha; output frame-rate adaptation can drop or repeat frames. | Admit only requested transforms and preserve alpha/fps where part of the source contract. |
| PCM s24 becomes left-shifted s32 and s32 remains s32, but PCM f64 becomes f32. | Do not route exact f64 decoding through this sample path. Packet copy or our existing precision-preserving implementation remains necessary. |
| `AudioSample` has u8/s16/s32/f32, channel count and rate, but no f64 format or explicit speaker mask. `toAudioBuffer()` uses f32. | Keep layout metadata externally; validate any precision-changing conversion. |
| The built-in resampling/mixing path converts to f32. Resampling uses linear interpolation and lacks a downsampling low-pass filter in the audited implementation. | Not a drop-in fidelity replacement for our resampling contracts. Qualify aliasing, clipping and sample extent before use. |
| Specific mono/stereo/quad/5.1 mappings exist; other mixing combinations use channel-index mapping with zero-fill/drop. | Channel count alone is insufficient for surround equivalence. |
| Optional FLAC encoder chooses 16 or 24 bits and right-shifts its s32 input accordingly. | No transparent full-precision int32 or float64 lossless claim; retain our exact-representability guards. |

Sources: [Conversion][conversion], [PCM decode][pcm-decode], [sample formats][sample-formats], [resampling and mixing][resample], [FLAC encoder][flac-precision], [FLAC bridge][flac-bridge].

MediaBunny's audio wrapper already compensates for Opus preskip, some browser timestamp behavior and sample-duration rounding. Our adapters must not apply the same trim twice or flatten intended gaps when converting clocks. Test original sample extent, partial endings, reset, seek and discontinuities. See [audio timing][audio-timing].

Video transformations include resize/crop/rotate/flip, frame-rate changes, user processing and encoder controls. These are useful for explicit export or preview profiles. Color metadata and HDR detection exist, but encoder failure can cause rerendering, and decode paths can fill missing color fields with defaults. No source audit proves physical HDR display, tone mapping, dynamic metadata preservation or color fidelity across such transformations. Preserve the existing HDR admission boundary. Sources: [video source processing][media-source], [conversion fallback][conversion-hdr], [track HDR heuristic][track-hdr].

Recording and generated-media APIs also exist: `CanvasSource`, `VideoSampleSource`, `AudioSampleSource`, `AudioBufferSource`, `MediaStreamVideoTrackSource` and `MediaStreamAudioTrackSource` feed output encoders/muxers. Encoded packet sources avoid encoding when the supplied packets already match the output contract. This could support clip export, captured-stream recording and generated previews without adding an FFmpeg CLI-like pipeline. Capture permissions, browser API availability, synchronization and encoder policy still belong to the application. The video capture source includes browser-dependent fallbacks and may require an explicit frame rate when track processing is unavailable. Treat recording as a separate product capability, not a prerequisite for adopting playback components. Source: [media sources][media-source].

## Subtitles, metadata and adaptive media

MediaBunny input exposes audio/video tracks; its subtitle facility is output-oriented. `TextSubtitleSource` takes supplied WebVTT cues for writing. It does not replace extraction/rendering of embedded SRT/mov_text, ASS/SSA/font behavior, PGS or VobSub. Matroska attachments can be discovered, but extracting a font is not rendering its subtitles. Keep the existing subtitle service beside browser A/V until an independent replacement is qualified. Sources: [input track types][input], [subtitle output][subtitle-output], [current subtitle ownership](COMPONENT-ROUTING.md).

Consequently, a MediaBunny-only probe cannot certify that an input has no required subtitle tracks. Supplement its A/V facts with our existing inspector or admit only a profile whose subtitle requirements are independently known. Likewise, preserve the user's selected track rather than automatically substituting MediaBunny's primary-track ranking.

HLS supplies flattened tracks, rendition pairing, lazy playlists/segments, live refresh/edge queries and timestamp mapping. Input can wait for live data unless instructed otherwise. Program-date-time may offset packets into Unix time; disabling that offset can collapse gaps. This requires an explicit mapping to Demuxe's timeline, not a duration cast. HLS output can create master/media playlists and segments through pathed targets, including live output. These are useful for inspection or export, but do not establish an automatic bitrate policy or a replacement for Shaka's full playback owner. Sources: [HLS reading](https://mediabunny.dev/guide/reading-hls), [HLS writing](https://mediabunny.dev/guide/writing-hls), [HLS source][hls-source].

Encryption is **partially supported**, not wholly absent: AES-128 HLS and clear-key ISO BMFF CENC-family handling exist. SAMPLE-AES/SAMPLE-AES-CTR are limited to ISO BMFF segments in the audited HLS path. The caller can supply keys through `resolveKeyId`; this is not commercial CDM/EME license/session playback. HLS subtitle reading is explicitly unsupported. No DASH input provider is present. Retain Shaka/native streaming and DRM ownership initially. Sources: [HLS encryption][hls-encryption], [ISO key callback][input-formats], [HLS guide](https://mediabunny.dev/guide/reading-hls#encrypted-content).

## Packaging and download behavior

Core is one npm package with ESM modules and `sideEffects:false`, making selective bundles possible. It does not publish a separate npm package per demuxer. Tree shaking removes unused code at build time; **independent on-demand downloads require our chunk/deployment design**. Avoid importing `ALL_FORMATS` into a format-specific bundle when it defeats the intended selection. The published core lists two `@types` dependencies; its media implementation does not pull in an FFmpeg runtime dependency. See [package metadata][package].

Extension distributions bundle worker/Wasm material into JavaScript. Deferred Wasm initialization is not deferred byte transfer if that JavaScript was eagerly loaded. AC-3/DTS native builds contain both their decoder and encoder implementations; a decoder-only JS import does not establish a decoder-only Wasm build. Treat optional extension imports and provider assets as explicit deployment closures. Sources: [AC-3 build recipe][ac3], [DTS build recipe][dts], [MP3 distribution][mp3].

Measured shipped **minified ESM bundle bytes**, with deterministic gzip level 9 applied locally:

| Artifact | Raw bytes | Gzip 9 bytes |
| --- | ---: | ---: |
| Core, all-format standalone bundle | 713,966 | 183,715 |
| AC-3/E-AC-3 extension | 1,147,260 | 297,042 |
| DTS extension | 1,623,471 | 416,696 |
| AAC encoder extension | 992,326 | 253,882 |
| MP3 encoder extension | 311,561 | 132,228 |
| FLAC encoder extension | 323,011 | 82,371 |
| ProRes extension standalone bundle | 258,067 | 50,196 |

These are the exact published files in the evidence record, not an optimized Demuxe build, browser heap, startup time or CPU result. Extension numbers exclude the separately required MediaBunny core. ESM/transitive packaging can differ from standalone bundles. Server's 66,981-byte wrapper was also measured, but excludes NodeAV/native dependencies and is not a meaningful complete-engine size comparison. No combined transfer-saving percentage is inferred.

Core and the seven package manifests declare MPL-2.0. Native implementations additionally involve FFmpeg, LAME, libFLAC or TurboRes; a top-level package label does not describe the entire binary closure. The npm archives retain bridge/source material and build instructions, but this audit did not establish exact reproducible upstream native-source/toolchain correspondence for every bundled Wasm. Apply Demuxe's existing source/build/notices and package audit gates before shipping those artifacts. This is an artifact-review requirement, not a claim of license incompatibility or upstream noncompliance.

Place implementation code in an optional provider package rather than importing it into the reusable Apache core. That follows the repository's explicit external-import and ownership boundary, independently of whether the implementation is JS or Wasm. Pin exact versions and transitive identities, generate asset hashes, preserve notices and audit assets/embedded distributions. Sources: [core boundary check](../scripts/check-core-boundary.mjs), [distribution policy](PROVIDER-DISTRIBUTION-DRAFT.md), [source/relink policy](PROVIDER-RELINK.md).

## Demuxe integration design

Proposed package identity: `@demuxe/provider-mediabunny` (not created by this audit). Start with one optional implementation package and distinct capability bindings; split physical delivery further only where measured deployment needs justify it.

| Existing seam | Proposed integration | Responsibilities retained by Demuxe |
| --- | --- | --- |
| `inspectMedia()` and route inspection | Bounded MediaBunny parser returning complete/partial facts | Byte/read/deadline limits, track requirements, source identity, FFmpeg inspection fallback |
| `media.prepare.file` / `browser-prepared` | Explicit MP4/MOV/MKV/WebM packet-copy preparation binding | NativePlayer/MSE scheduling, selected tracks, output verification, seek/replacement lifecycle |
| Existing `selected-mp4-view` trial | Reference for conditional JS preparation, not a universal implementation | Exact admission and restoration behavior |
| Component recipe and container owner interfaces | Demux/mux adapter beside explicitly selected existing audio slices | Whole-composition qualification, PCM/layout/clock contracts, source-scoped acquisition |
| `PreviewProvider` | `canHandle/getFrame/release` backed by sample/canvas sinks | Requested versus actual PTS, fidelity, cancellation, resource budgets, decoder competition |
| Selected audio service | Later packet-to-PCM integration with browser video | Clock/ring/worklet ownership, drift, starvation, rate/pitch, seeks and output layout |
| Shaka and subtitle services | Remain independent maintained owners | Adaptive playback/DRM and rich/bitmap subtitle compatibility |

Code pointers: [inspection](../src/sources.ts), [route inspection](../src/internal/machine/route-inspection.ts), [execution recipes](../src/internal/execution-recipes.ts), [NativePlayer preparation](../src/internal/native-player.ts), [component recipes](../src/internal/component-recipes.ts), [container owners](../packages/provider-container/src/owners.ts), [preview contract](../src/preview/controller.ts), [service providers](../src/internal/media-providers.ts).

Do not implement one catch-all “MediaBunny failed, try FFmpeg” handler. Unsupported media/profile or incomplete parser evidence can follow established compatibility fallback. Missing deployment, unqualified composition, declared asset corruption/acquisition failure, authorization failure and source-identity change remain distinct. The existing resolver requires one evidence record for the exact complete binding and preserves terminal acquisition failures. A successful component cannot qualify an untested combination. Sources: [provider resolution](../src/internal/provider-resolution.ts), [acquisition](../src/internal/provider-acquisition.ts).

Native-first provider preference should be applied at admission/acquisition, before custom coder registration. Prefer browser Direct/MSE clock and presentation where they already satisfy the requested semantics. A full WebCodecs A/V route is possible later, but also transfers synchronization and presentation work into application code. FFmpeg/mpv stay deployed as backups for supported fallback compositions; optional audio/subtitle services can fill individual gaps without moving all video into software.

## Staged adoption and acceptance

| Stage | Concrete candidate | Required exit evidence |
| --- | --- | --- |
| 1 | Local-file inspection and preview provider | Exact track/config/metadata parity, bounded incomplete results, cancellation and actual preview PTS; no unused codec downloads |
| 2 | Local MP4/MOV/MKV/WebM packet-copy preparation into browser playback | Required tracks retained, B-frame/negative-start/edit handling, decoded A/V equivalence, first output, pause/seek/EOF and MSE resource bounds |
| 3 | Remote versions through Demuxe transport | Range/identity/auth refresh parity, read/deadline limits, changed source and redirect rejection, seek under truncation/stall |
| 4 | Selected existing codec slices or an alternative ProRes provider | Exact packet/config/clock/precision/layout contracts plus whole-player lifecycle; native-first registration and worker retirement |
| 5 | Export, transforms, selected HLS tools and additional compositions | Explicit transform permission, retained track/metadata semantics, rate/layout/alpha/HDR-specific qualification and isolated resource evidence |

Every stage retains the existing FFmpeg/mpv route and negative controls. Package-only, native codec-only, browser decode-only and complete playback evidence remain distinct.

Minimum matrix for each binding:

1. Pin package, bridge, generated JS/Wasm, browser/device class, fixtures and all providers in the tested composition. Test absent and corrupt deployments separately; idle and already-native playback must not download fallback codecs.
2. Compare selected track identities, language/disposition, codec configuration, rotation/display dimensions, color metadata and metadata completeness. Detect skipped selected tracks, simplified edits, unsupported encodings and unknown profiles before admission.
3. Exercise decode versus presentation ordering, B frames, negative starts, edit lists, Matroska delay/padding/preroll, AAC/Opus priming/tail extent, discontinuities and multi-track offsets. Match decoded content and presentation semantics; do not require the writer to preserve an unavailable original DTS field.
4. Prove seek target arrival, forward progression and fresh post-seek audio/video, including backward seeks and near-EOF. Include long inputs, pause/resume, rate changes, alternate-track selection and EOF/drain.
5. For audio fidelity, retain sample-exact integer/f64 rejection controls, speaker-position signals, sample counts and float tolerances. Resampling requires separate spectral/aliasing tests. Do not equate channel count with layout or FLAC output with transparent source preservation.
6. Exercise cancellation during import/read/decode/mux, overlapping opens/seeks, source replacement and late completion. Release frames, buffers, worker realms, source handles and Blob URLs; test concurrent players and registered-coder isolation.
7. Preserve remote auth, source identity, redirects, range lengths/encoding and all configured budgets. Every referenced HLS resource must remain within the authorized source policy.
8. Test browser-only, browser plus a codec/subtitle slice, unavailable component and broad FFmpeg/mpv backup paths on target browsers. Run installed assets and embedded delivery separately.
9. Only after correctness, compare exact binding sets for transfer bytes, cold/warm startup, first output, seek cost, steady CPU, peak memory and copies. Keep missing measurements unknown; use a representative media/browser/feature corpus before claiming a session coverage percentage.

## Existing evidence and remaining uncertainty

The [2026-09-25 MediaBunny investigation](../experiments/mediabunny-investigation/REPORT.md) used **1.60.0**. It demonstrated common-format packet extraction, browser/extension decoding and one bounded real-time H.264/AAC composition. It did not qualify seek, complete output fidelity or full player lifecycle. Worker-presented CPU results overlapped Hybrid, and the tested URL defaults transferred more bytes on that local workload. Those observations neither prove a performance win nor disqualify a smaller optional-provider role.

For **1.63.0**, this audit establishes published/source capability, concrete adapter risks and exact downloaded package identities. It executes no playback, native build, conformance suite or benchmark. No MediaBunny provider has been admitted by this work. The next useful implementation is a bounded inspection/preview or packet-copy provider with a finite acceptance matrix, while FFmpeg/mpv remain the backup.

[input-formats]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/input-format.ts
[output-formats]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/output-format.ts
[iso-edits]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/isobmff/isobmff-demuxer.ts#L1113
[mkv-encoding]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/matroska/matroska-demuxer.ts#L1152
[wave-fields]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/wave/wave-demuxer.ts#L174
[ts-parser]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/mpeg-ts/mpeg-ts-demuxer.ts#L303
[input]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/input.ts
[tracks]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/input-track.ts
[metadata]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/metadata.ts
[packet]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/packet.ts#L66
[mp4-timing]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/isobmff/isobmff-muxer.ts#L1025
[sinks]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-sink.ts
[source]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/source.ts
[target]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/target.ts
[url-options]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/source.ts#L712
[url-fallback]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/source.ts#L1026
[codecs]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/codec.ts#L49
[ac3]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/ac3/README.md
[dts]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/dts/README.md
[aac]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/aac-encoder/README.md
[mp3]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/mp3-encoder/README.md
[flac]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/flac-encoder/README.md
[prores]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/prores/README.md
[server]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/server/README.md
[custom]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/custom-coder.ts
[decode]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/decode.ts#L174
[video-selection]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-sink.ts#L978
[audio-selection]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-sink.ts#L2311
[worker-lifetime]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/ac3/src/worker-client.ts#L38
[samples]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/sample.ts
[conversion]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/conversion.ts
[pcm-decode]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-sink.ts#L2513
[sample-formats]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/sample.ts#L2448
[resample]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/resample.ts
[flac-precision]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/flac-encoder/src/encoder.ts#L99
[flac-bridge]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/packages/flac-encoder/src/bridge.c#L170
[audio-timing]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-sink.ts#L2257
[media-source]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-source.ts
[conversion-hdr]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/conversion.ts#L1781
[track-hdr]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/input-track.ts#L815
[subtitle-output]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/media-source.ts#L3407
[hls-source]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/hls/hls-demuxer.ts
[hls-encryption]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/src/hls/hls-segmented-input.ts#L733
[package]: https://github.com/Vanilagy/mediabunny/blob/0f80f47e617b576737ffd4ce39a626eb7c7e934e/package.json
