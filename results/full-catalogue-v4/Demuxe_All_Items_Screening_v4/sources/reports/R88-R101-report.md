# Demuxe media/browser frontier — R88–R101 executed results

**Run date:** 17 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Linux x86-64.  
**Scope:** media representation, muxing, browser playback and data-path experiments. No Demuxe production source changes.

## Result summary

| ID | Verdict | Result |
|---|---|---|
| R88 | **PROMISING** | Native HLS playlist over existing fMP4 init/segments loaded directly in Chromium, decoded A/V, sought, and reached EOF; real HTTP request behavior not tested. |
| R89 | **PROMISING** | Three AVIF AV1 payloads were packet-copied into a timed AV1 MP4 with identical compressed hashes; an MP4 sample copied back to AVIF also retained its payload and Chrome decoded matching colors. |
| R90 | **NOT WORTH COMPLEXITY** | The complete fragmented MP4 already plays directly in Chrome with seek/EOF, so a custom flattened metadata view has no demonstrated route value for this finite local profile. Flat remux preserves compressed payloads but normalizes some timing metadata. |
| R91 | **PROMISING** | One SourceBuffer crossed 640x360 to 320x180 using only second-epoch media carrying SPS/PPS; backward and forward seeks restored each epoch. Removing in-band SPS/PPS caused a decode failure at the second epoch. |
| R92 | **BLOCKED / INCONCLUSIVE** | Installed VP9 split/merge filters work, but the generated fixture contained no superframes/invisible-frame grouping so the transform was a no-op; secure WebCodecs is also unavailable. |
| R93 | **PROMISING** | Opus 20 ms packets were regrouped losslessly to 40/60 ms packets without PCM decoding; reverse splitting restored original compressed packets and decoded PCM is bit-exact. Chrome direct playback/seek/EOF is unchanged. |
| R94 | **PROMISING** | An arbitrary 48,521-sample Opus crop is exact without re-encoding when enough preroll is retained. In this fixture 48 packets (~960 ms) reached bit-exact PCM; shorter prerolls converged but were not exact. Chrome emits audio immediately, although nominal media duration includes hidden preroll. |
| R95 | **PROMISING** | Opus header gain changed output by the requested -6/-12 dB while every encoded audio packet remained unchanged. Chrome Web Audio measured matching amplitude ratios and seek/EOF remained normal. |
| R96 | **PROMISING** | A 12 s native A/V presentation with three visual changes used only three coded video samples versus 360 conventional samples, preserved held-frame seeks in Chrome, and substantially reduced video decode work. |
| R97 | **PARTIAL / PROMISING DESTINATION** | Chrome natively reconstructs VP8/WebM alpha and packet-copy remux preserves main VP8 payloads plus Matroska BlockAdditional alpha side data. Assembly from two already-compressed independent color/mask streams remains unqualified. |
| R98 | **PROMISING / HARDWARE QUALIFICATION PENDING** | A 2x2 atlas closely reproduces four independent synchronized videos. In a fair one-process host software-decode screen it used ~40% less CPU; Chrome functionally decoded all source frames, but physical-GPU resource/power behavior is untested. |
| R99 | **BLOCKED** | FFmpeg has the dovi_rpu filter, but no trusted Dolby Vision profile 8.1 fixture or HDR-capable physical display is available here, so no truthful HDR10-base playback test was possible. |
| R100 | **PROMISING COMPONENT / DECODER BLOCKED** | EncodedVideoChunk transfer detaches owned ArrayBuffers and preserves exact subview bytes. Constructor microbenchmarks strongly favor transfer, but VideoDecoder is unavailable on this non-secure page so end-to-end decode/memory impact remains unqualified. |
| R101 | **BLOCKED** | A physical GPU/display overlay path is unavailable. The only renderable GL path requires forced ANGLE SwiftShader, so native hardware-overlay efficiency cannot be qualified. |


QA: **23/23 bounded evidence checks passed.**

## R88 — Native HLS over existing fMP4 — PROMISING

A direct `application/vnd.apple.mpegurl` Blob playlist referencing Blob URLs for the existing fMP4 initialization and media segments loaded in Chromium without a JavaScript HLS library. `canPlayType()` returned `maybe`. The HLS presentation reported 6.066666 s, decoded both video and audio (`webkitAudioDecodedByteCount` reached 41491 bytes in this run), sought to 3.2 s, and reached EOF. Direct MP4 also passed.

This establishes a native Chrome HLS route in this build. It does **not** establish an HTTP/network win because administrator policy prevents the real HTTP request-log experiment; Blob URLs replaced network delivery.

## R89 — AVIF payloads as timed AV1 video — PROMISING

Three independently encoded 320×180 AVIF stills (red/green/blue) were fed through FFmpeg's concat demuxer and packet-copied into MP4. The first three AV1 packet SHA-256 hashes are **identical** to the respective AVIF packet hashes. Chrome presented the matching colors at 0.5/1.5/2.5 s, supported seek and EOF.

The reverse direction also worked: the green MP4 sample was packet-copied into AVIF and retained the exact compressed packet SHA-256. Chrome decoded the original and reconstructed AVIF to the same center pixel `[1,128,2,255]`.

This is a real compressed-representation crossover: compatible AV1 coded images can become timed media, and eligible independent AV1 samples can become AVIF, without a pixel round trip.

## R90 — finite fMP4 → flat indexed view — NOT WORTH COMPLEXITY for this profile

The original complete fragmented MP4 already plays directly as a Chrome Blob, seeks and reaches EOF. The flat packet-copy reference also passes. Video and audio payload hashes remain identical through flattening, although FFmpeg normalizes some timing metadata (for example the first video DTS changes by a small edit/timestamp offset).

Because the original finite fMP4 is already a satisfactory browser-owned file source, the custom JS sample-table reconstruction proposed by R90 has no demonstrated value for this profile. A different remote/range-read workload would need a distinct experiment.

## R91 — in-band H.264 configuration epochs — PROMISING

One MSE SourceBuffer received only the first initialization segment. Epoch A was 640×360 red; epoch B was 320×180 blue. The second epoch appended **media bytes only**, with SPS/PPS present in-band. Chromium switched dimensions correctly:

- 0.7 s → 640×360 red
- 2.7 s → 320×180 blue
- seek back to 0.7 s → 640×360 red
- seek forward again → 320×180 blue

A negative control removed repeated SPS/PPS from the second epoch. Its bytes appended, but decode failed at the epoch boundary with Chrome media error code 3 and the old 640×360 configuration remained. This isolates the useful mechanism: valid in-band configuration data, not merely changing dimensions.

Both `avc3` and the deliberately repeated-header `avc1` construction happened to work in this Chromium. `avc3` remains the semantically appropriate container signaling; Chrome's tolerance of the `avc1` control should not be generalized.

## R92 — VP9 codec-unit normalization — BLOCKED / INCONCLUSIVE

The installed FFmpeg has `vp9_superframe`, `vp9_superframe_split`, and `vp9_raw_reorder`. However, the locally generated VP9 fixture contained no superframe/invisible-frame grouping that the filters could transform: split→merge remained 180 packets with identical payload hashes. The secure WebCodecs branch is also unavailable (`VideoDecoder` is undefined on the permitted opaque page).

FFmpeg's own FATE suite names `vp90-2-segmentation-sf-akiyo.webm` for its superframe split/merge test, but that external binary fixture could not be materialized into this sandbox. This card remains blocked rather than failed.

## R93 — Opus repacketization without PCM — PROMISING

The 12 s Opus source contains 601 20-ms audio packets. libopus repacketization produced:

- 40-ms grouping: **301 packets**
- 60-ms grouping: **201 packets**

Splitting the grouped packets back through the repacketizer recovered the original compressed packets exactly. More importantly, FFmpeg-decoded PCM SHA-256 is identical for the original, 40-ms and 60-ms streams: `4f715ec471d67d3a5c60daeb07215b76ad15d92d2987fadae811e09df14c4d4b`.

Chrome direct playback, seeking and EOF all pass with the same nominal duration. Ogg file size barely changes (180402 → 180288 / 180548 bytes), so the opportunity is **packet/submission frequency and availability latency**, not meaningful bandwidth reduction.

## R94 — sample-accurate compressed Opus crop — PROMISING

Requested output: **48,521 samples** starting at an intentionally non-frame-aligned source sample. Encoded packets were retained for decoder history; only Opus pre-skip/final granule metadata changed.

Preroll convergence in the host PCM oracle:

| retained preroll | mismatching samples | max error |
|---:|---:|---:|
| 4 packets (~80 ms) | 4827 | 30 |
| 8 (~160 ms) | 1420 | 3 |
| 12 (~240 ms) | 75 | 1 |
| 24 (~480 ms) | 1 | 1 |
| 48 (~960 ms) | **0 — bit exact** | 0 |

The 48-packet crop decodes to exactly 48,521 samples. Chrome begins producing the tone immediately (120 ms probe RMS 0.03530) and actually ends after about 1022 ms at 1×, close to the ~1011 ms requested output. However, HTML's nominal `duration` is 1.980208 s because it includes hidden preroll; final `currentTime` jumps to that container duration at EOF. The media result works, but a consumer needs an explicit visible-timeline mapping.

## R95 — Opus fixed gain in metadata — PROMISING

The -6 dB and -12 dB variants preserve **every encoded Opus audio packet hash**. Host decoded RMS ratios are:

- -6 dB: **0.501187205** (ideal 0.501187...)
- -12 dB: **0.251188636** (ideal 0.251188...)

Chrome/Web Audio observed ratios 0.501790 and 0.251174. Both variants seek and reach EOF normally. This is a genuine static compressed-domain playback instruction, not re-encoding and not a live automation replacement.

## R96 — sparse native video with long holds — PROMISING

The same 12 s slide/audio presentation was represented two ways:

| | sparse | conventional |
|---|---:|---:|
| coded video packets | **3** | 360 |
| compressed video payload | **957 B** | 8,048 B |
| host video-decode CPU median | **65.3 ms** | 161.2 ms |
| Chrome rVFC callbacks at 4× | **3** | 181 |

Host video-decode CPU fell **59.5%**, and compressed video bytes fell **88.1%**. Total file-size reduction is much smaller because the continuous AAC track dominates. Chrome showed the correct red/green/blue picture when seeking inside each 4-second hold and reached EOF.

This strongly supports sparse coded pictures for intentionally static presentations. It does not imply zero compositor/display refresh work.

## R97 — native transparent WebM — PARTIAL / PROMISING DESTINATION

A controlled VP8/WebM alpha stream with half-frame alpha 64 and half-frame alpha 192 decoded natively in Chrome. Canvas observation after seeking returned exactly those alpha values. FFmpeg packet-copy remux preserved all 120 main VP8 packet hashes and retained `Matroska BlockAdditional` side data on every packet; the copied WebM still decoded to alpha 64/192 in Chrome.

So Chrome's native alpha destination and packet-copy preservation are validated. The final proposed construction step—combining **two independently existing compressed color and alpha streams** into Block/BlockAdditional without re-encoding—was not executed with the available CLI tooling. Keep this PARTIAL rather than claiming the full route.

## R98 — one atlas video for four synchronized clips — PROMISING / hardware pending

At 2 s, the four atlas quadrants match independently encoded references with mean absolute RGB errors of `0.077, 0.083, 0.166, 0.101` /255. Atlas size is 46,687 bytes versus 66,270 bytes for the four independent files.

A fairer host software-decode comparison used **one FFmpeg process for all four independent streams** versus one process for the atlas:

- independent CPU median: 163.9 ms
- atlas CPU median: 98.5 ms
- CPU reduction: **39.9%**
- wall reduction: **21.9%**

Chromium decoded all 120 frames of all four simultaneous videos and all 120 atlas frames in the 4× probe. But this environment lacks a physical GPU, so decoder-instance, GPU bandwidth, power and overlay savings remain unqualified.

## R99 — Dolby Vision 8.1 compatible base — BLOCKED

`dovi_rpu` is present in FFmpeg 7.1.5, but the lab has neither a trusted Profile 8.1 fixture nor an HDR-capable physical display. Generating synthetic RPU bytes would violate the card's trusted-oracle requirement. No HDR compatibility conclusion is made.

## R100 — transfer owned storage into EncodedVideoChunk — PROMISING COMPONENT / decoder blocked

Even on this non-secure page, `EncodedVideoChunk` is exposed and its constructor `transfer` list is functional. Passing a 100-byte subview of a 1 MiB ArrayBuffer:

- detaches the backing ArrayBuffer;
- creates a 100-byte chunk;
- `copyTo()` recovers the exact 100 input bytes.

Seven-run constructor microbenchmark medians:

| input workload | copy | transfer |
|---|---:|---:|
| 1,000 × 64 KiB | 42.0 ms | **8.6 ms** |
| 100 × 1 MiB | 67.8 ms | **1.2 ms** |

This is strong evidence that transferred construction avoids substantial application-visible copying in this build. `VideoDecoder` itself is unavailable on the non-secure page, so total decode CPU and retained browser memory are still unqualified.

## R101 — native overlay/display path — BLOCKED

No physical GPU/display is available. Headless Chromium exposes no WebGL renderer; under Xvfb the only usable path requires `--use-angle=swiftshader`, reporting `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. That cannot qualify hardware overlays, native surface promotion, display bandwidth or power. The card remains blocked.

## Overall

The batch found several genuinely different media mechanisms rather than only player-level tuning:

- **manifest as route:** R88
- **still-image/video compressed crossover:** R89
- **configuration carried inside coded media:** R91
- **lossless codec repacketization:** R93
- **sample-accurate trimming via retained decoder history + metadata:** R94
- **header-directed gain:** R95
- **sparse picture timelines:** R96
- **native auxiliary alpha:** R97
- **decoder aggregation via atlases:** R98
- **ownership transfer at the codec API boundary:** R100

R90 closed early for its tested profile. R92, R99 and R101 need a specialized fixture, secure API surface, or physical hardware rather than more synthetic work in this sandbox.

## External fixture note for R92

FFmpeg's FATE configuration uses `vp90-2-segmentation-sf-akiyo.webm` with `vp9_superframe_split,vp9_superframe` as its superframe round-trip sample. Source index: https://fate-suite.ffmpeg.org/vp9-test-vectors/ . The binary could not be imported into this environment, so it is a resume target, not executed evidence here.