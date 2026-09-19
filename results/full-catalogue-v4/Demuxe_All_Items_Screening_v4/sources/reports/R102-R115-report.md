# Demuxe media/browser frontier — R102–R115 executed results

**Run date:** 17 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Linux x86-64.  
**Scope:** compressed media surgery, container routing, Chrome parser/playback behavior, and prepared representations. No Demuxe production source changes.

## Outcome summary

| ID | Verdict | Decisive result |
|---|---|---|
| R102 | **PROMISING — narrow carrier** | True FLAC verbatim subframes carry S16 PCM exactly through native Chrome/FLAC-in-MP4. ~12–13% lower host formatter CPU than FFmpeg FLAC level 5 here, but up to 6.94× the tonal bytes. |
| R103 | **PROMISING** | Independent compressed FLAC subframes can be assembled and reordered while preserving their coded bits and exact decoded PCM; dependent mid/side inputs are rejected. |
| R104 | **PROMISING** | Two existing mono Opus elementary streams can become a two-stream multistream Opus presentation without re-encoding; source packets recover exactly and Chrome exposes both channel tones. |
| R105 | **BLOCKED** | No compressed HEVC tile-merger tool is installed and this Linux Chromium rejects the HEVC fixture for direct/MSE playback. |
| R106 | **INCONCLUSIVE — mechanism works** | Chrome correctly decodes AV1 `show_existing_frame`; five operations were present, but the encoder-generated representation was slightly larger and did not implement the proposed explicit picture dictionary. |
| R107 | **PROMISING COMPONENT / PARTIAL** | Disabling film-grain synthesis while decoding the same AV1 bitstream reduced host decode CPU **10.8%**; output intentionally changes. External reconstruction remains untested. |
| R108 | **PROMISING** | JPEG coefficient-domain aligned crop is pixel-exact after decode and Chrome accepts the resulting smaller JPEG. |
| R109 | **PROMISING** | Native Chrome plays a virtual edited A→B→A MP4 whose media body maps back to original AV1 payload views; five forced HTTP Range requests still produce correct playback/EOF. |
| R110 | **PROMISING ROUTING RULE** | Direct Chrome accepts laced Opus WebM; MSE rejects it. Unlacing preserves decoded PCM and restores MSE compatibility. |
| R111 | **NOT WORTH COMPLEXITY** | FFmpeg already uses fMP4 defaults heavily; the remaining theoretical repeated-duration saving is only **388 B / 0.059%** before added box overhead. |
| R112 | **PROMISING** | A truthful WebM `BlockDuration` lets Chrome surface the first MSE frame before the next timestamp arrives; the same first block without duration produces zero frame callbacks. |
| R113 | **PROMISING — prepared representation** | Full-resolution Y/U/V carried in a 4:2:0 video's luma atlas round-trips **bit-exactly** through the host 4:2:0 decoder; Chrome plays the carrier. |
| R114 | **BLOCKED** | Local WebRTC gathers no usable ICE candidates, so the native RTP media-receiver route cannot be exercised here. |
| R115 | **PROMISING / STRONG** | Ordinary `<video src>` begins fragmented-MP4 playback from an unfinished HTTP response, stalls when fragment bytes are withheld, resumes when bytes arrive, and reaches EOF—no MSE or manifest. |

**Totals:** 10 promising, 1 inconclusive, 2 blocked, 1 not worth complexity. QA: **31/31 checks passed.**

## R102 — true verbatim FLAC as a PCM carrier

The first control was important: FFmpeg with `-lpc_type none` did **not** emit FLAC's verbatim subframe type; it still used fixed-predictor subframes. A small bounded C writer therefore authored actual type-1 verbatim FLAC frames with valid CRC-8/CRC-16 framing.

Both deterministic 30-second S16 stereo inputs decode byte-for-byte to their source PCM, and Chrome accepts both direct FLAC and FLAC-in-fMP4/MSE.

| Input | true verbatim CPU | level-5 CPU | CPU delta | true verbatim bytes | level-5 bytes |
|---|---:|---:|---:|---:|---:|
| tonal | 125.4 ms | 142.4 ms | **-12.0%** | 5,764,490 | 830,344 |
| noise | 127.2 ms | 146.5 ms | **-13.2%** | 5,764,490 | 4,668,252 |

This supports a **simple temporary integer-PCM carrier**, not a better general-purpose audio format. On tonal material the carrier is 6.94× the level-5 FLAC size. The benchmark also compares a tiny specialized executable with FFmpeg process/encoder work, so the percentage is a host component screen rather than a projected player speedup.

Evidence: `results/r102.json`, `scripts/r102_verbatim.c`, `results/browser.json`.

## R103 — compressed FLAC subframe channel surgery

Two independently encoded mono FLAC streams were assembled into stereo by copying their compressed subframe bit ranges into newly framed FLAC packets. For the first ten frames the source and destination subframe bit sequences are identical, and complete decoded PCM equals an interleaved decode of the two sources.

A four-independent-channel source was also transformed into a stereo **channel 3 → channel 0 / channel 1 → channel 1** representation without PCM reconstruction; decoded PCM matches a decode-and-pan oracle exactly. A mid/side FLAC control is correctly rejected because those subframes are dependent rather than independent channels.

Chrome plays both transformed files. Web Audio observes the intended independent ~330 Hz / ~770 Hz stereo signatures.

This demonstrates genuine **compressed-domain lossless channel assembly/reordering**, under strict sample-rate/block/bit-depth alignment and independent-channel admission.

Evidence: `results/r103.json`, `results/channel_browser.json`, `scripts/host_audio.py`.

## R104 — compressed Opus component-stream assembly

Two independently encoded mono 20-ms Opus streams were packetized into one mapping-family-255 presentation with two elementary streams and no coupled stream. The self-delimited first component can be split back out, recovering every original elementary packet exactly.

Host decoding produced **0.0 max floating-point sample error** versus the two independent decodes. Chrome plays the multistream Ogg to EOF, and channel analysis sees peaks around **441.4 Hz and 882.9 Hz**.

This supports selecting/assembling **whole independently coded Opus component streams** without re-encoding. It does not allow extracting one channel from an ordinary coupled stereo stream, nor source separation from a mixed soundtrack.

Evidence: `results/r104.json`, `results/channel_browser.json`, `scripts/opus_ogg.py`.

## R105 — compressed HEVC tile/mosaic merge

This card is **BLOCKED in the lab**, not disproven. GPAC/MP4Box or another existing compressed HEVC tile-merger is unavailable, and the Chromium build reports neither direct nor MSE support for the generated HEVC source (`DEMUXER_ERROR_NO_SUPPORTED_STREAMS`). Building a complete HEVC slice/tile merger solely to work around both blockers would no longer be the smallest decisive experiment.

Evidence: `results/browser.json` (`r105`).

## R106 — AV1 `show_existing_frame`

A libaom stream with alt-ref enabled contains **5 `show_existing_frame=1` operations**. Chrome decodes the intended A→B→A→C→B→A presentation correctly. A control encoded without alt-ref contains none.

However, the alt-ref stream is **5,778 B** versus **5,637 B** for the control, so the encoder's normal reference/overlay strategy is not a size win in this tiny fixture. More importantly, it does not construct the explicit reusable picture dictionary proposed by R106.

Verdict: the Chrome decoder mechanism is real; the proposed prepared representation still needs a direct AV1 bitstream authoring experiment.

Evidence: `results/r106.json`, `results/browser.json`.

## R107 — separate AV1 base reconstruction from film-grain synthesis

The 6-second AV1 fixture carries film-grain syntax and applies grain on all **180 frames**. Decoding the **same encoded bytes** with libdav1d grain disabled changes the reconstructed output hash but reduces median host decoder CPU from **266.5 ms to 237.8 ms (10.8%)** and wall time by 7.9%.

This establishes the component boundary and cost in this decoder/fixture. It does **not** yet prove a faster fidelity-preserving pipeline: separately reproducing AV1 grain outside the decoder was not implemented, and grain-disabled output is intentionally different.

Evidence: `results/r107.json`.

## R108 — JPEG coefficient-domain crop

A 640×352 JPEG was cropped to an iMCU-aligned 320×176 region by copying DCT coefficient blocks with libjpeg's coefficient API, then writing a new JPEG. Decoding the transformed image is **pixel-exact** to cropping the decoded source: MAE 0, max error 0.

The result shrank from **19,595 B to 6,514 B** and Chrome decodes both dimensions correctly. The measured ~1.3 ms coefficient tool versus ~63 ms FFmpeg decode/crop/re-encode is **not** presented as a 49× production speedup because the latter includes a different implementation, process startup, pixel decoding, and a lossy re-encode. The durable result is exact compressed-domain crop feasibility.

Evidence: `results/r108.json`, `scripts/r108_crop.c`, `results/browser.json`.

## R109 — virtual byte-range edited MP4

The test composition is **red A → blue B → red A** using compatible AV1 MP4 sources. The reference's media payload equals `A.mdat + B.mdat + A.mdat` exactly. A virtual HTTP resource exposes the reference-authored MP4 header region and maps its media ranges back to the original source payload pieces rather than serving one materialized movie body.

With responses capped to 1,200 bytes, Chromium requested:

`bytes=0-, bytes=1200-, bytes=2400-, bytes=3600-, bytes=4800-`

and still presented red → blue → red for 6 seconds and reached EOF. This is strong evidence that an edited native file can be represented as a **logical byte-address space over original compressed payloads**.

The remaining architectural step is authoring those MP4 headers/sample tables directly in the application rather than using an FFmpeg-authored materialized reference as the metadata oracle.

Evidence: `results/r109.json`, `results/r109_ranges.json`, `scripts/r109_ranges.py`.

## R110 — route based on WebM lacing

The same 3-second Opus payload was represented as 150 ordinary blocks or **52 Xiph-laced blocks** containing 148 laced frames. Host-decoded PCM hashes are identical. Direct Chrome playback accepts both files.

Chrome MSE gives a different answer:

- unlaced Opus WebM → **accepted, plays to EOF**
- laced Opus WebM → **SourceBuffer error, no buffered media**

Lacing cut block count 65.3% but file bytes only 0.94%. The valuable result is therefore not compression; it is a concrete **destination-aware mux transform**: preserve lacing for a direct-file route if desired, unlace codec-identical packets for MSE.

Evidence: `results/r110_host.json`, `results/browser.json`.

## R111 — compact fMP4 metadata defaults

The tested FFmpeg fragmented MP4 already uses `tfhd` defaults for duration, size, and flags and omits repeated per-sample duration/flags on most runs. Two audio edge runs contain duration exceptions, but an optimistic representation calculation finds only **388 repeated duration bytes (0.059% of 658,235 B)** before accounting for additional `trun`/box overhead needed to isolate exceptions.

Verdict: **NOT WORTH COMPLEXITY** for this profile. Revisit only for an unusually metadata-heavy low-bitrate/tiny-fragment workload.

Evidence: `results/r111.json`.

## R112 — explicit WebM duration avoids parser holdback

Two three-frame VP8 WebMs differ only in that the first frame of the candidate is wrapped in a `BlockGroup` with a truthful **500 ms BlockDuration**. Complete direct playback succeeds for both.

The decisive experiment appends only initialization plus the first block to MSE and withholds the next timestamp for 300 ms:

| first-block representation | buffered end | rVFC callbacks |
|---|---:|---:|
| no explicit duration | 0.063 s | **0** |
| BlockDuration=500 ms | 0.500 s | **1** |

This directly demonstrates a Chrome parser/presentation optimization: when truthful duration is already known, carrying it in WebM lets the first frame become presentable without waiting for another timestamp. It is distinct from changing when the producer emits the next cluster.

Evidence: `results/r112_partial_play.json`, `results/r112_direct.json`, `scripts/webm_tools.py`.

## R113 — full-resolution planes through a 4:2:0 carrier

A deliberately adversarial 320×180 YUV444 source has high-frequency chroma that ordinary 4:2:0 conversion destroys. The prepared carrier instead creates a 960×180 YUV420 video whose **luma plane is `[Y | U | V]`**, while carrier chroma is neutral.

After ordinary H.264 4:2:0 encode/decode, slicing that decoded luma back into thirds reconstructs the original Y/U/V samples with **MAE 0, max error 0, exact fraction 1.0** in the host oracle. Chrome plays all 60 frames of the 960×180 carrier.

The unusual synthetic fixture produced favorable file/decode figures, but those are deliberately **not generalized** to natural media. The important result is representational: full-resolution color planes can survive a browser-supported 4:2:0 codec by being carried as luma data. A browser shader reconstruction and quality/performance study are still required.

Evidence: `results/r113.json`, `results/browser.json`.

## R114 — WebRTC media receiver route

`RTCPeerConnection` is exposed, but the local receive probe completes ICE gathering with **zero usable candidates**. No pinned external RTP/WebRTC sender is available in this environment, so the actual browser media-receiver route cannot be tested honestly.

Verdict: **BLOCKED**, not failed.

Evidence: `results/browser.json` (`r114`).

## R115 — progressive native fMP4 in one unfinished HTTP response

This produced one of the strongest Chrome routing results in the batch.

A normal `<video src>` requested one fragmented MP4 HTTP resource. The server sent **213,986 bytes** containing initialization plus the first complete fragment, kept the HTTP response open for roughly **3 seconds**, then sent the remaining **444,249 bytes**.

Chromium:

1. received the first chunk at server t≈0.541s;
2. fired `loadedmetadata` at ~14 ms browser-relative;
3. fired `playing` at ~60 ms while the response was still open;
4. advanced to ~0.606 s, then `waiting` because later bytes were intentionally absent;
5. received the rest at server t≈3.542s;
6. resumed `playing` around 3.008 s browser-relative;
7. reached EOF at **6.061333s** with **180 frames** and no media error.

This proves that, for this fragmented-MP4 profile, **plain native Chrome playback can consume a progressively produced single HTTP response before response EOF**—without MediaSource and without HLS/DASH.

It does not yet establish seeking, reconnect/resume, indefinite live operation, proxy buffering behavior, authentication refresh, or good behavior under arbitrary fragment delay.

Evidence: `results/r115_fast.json`, `scripts/r115_fast.py`.

## What this batch adds

Several of these are genuinely new media execution mechanisms rather than small player optimizations:

- **compressed channel surgery:** R103/R104;
- **codec-internal optional reconstruction:** R107;
- **coefficient-domain image editing:** R108;
- **virtual edited media as a byte-address space:** R109;
- **container form chosen by destination:** R110;
- **parser latency controlled by truthful timing metadata:** R112;
- **richer pixel data carried through a simpler codec profile:** R113;
- **native progressive playback without manifest/MSE:** R115.

The particularly interesting next branches are **R109 + R115** (virtual generated file versus progressively generated file), **R103/R104** (how far compressed channel routing can go), and **R112** (systematically identifying metadata that changes when Chrome can release/present samples).

## Evidence boundary

Host timings include process/implementation effects and are not projections of Demuxe Wasm cost. Chrome was tested in the managed environment available here; secure APIs, local page navigation, physical hardware decode/display, and unrestricted WebRTC are not silently substituted. A successful media parser result is kept separate from decoded/presented output, and prepared representations such as R113 do not claim fidelity/cost advantages outside their explicit fixtures.