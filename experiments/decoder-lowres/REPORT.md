<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FFmpeg decoder lowres in the Software YUV path

**Decision: CORRECTNESS/QUALITY BLOCKER for an Auto lowres policy.** Decoder-side reduced reconstruction works, but a source/display ratio alone does not predict whole-player CPU benefit or visual acceptability. Keep production selection unchanged. A separate, explicitly approximate mode could revisit lowres=1 after a broader quality contract and stable CPU attribution; lowres=2/3 do not qualify here.

## Provenance and method

- Checkout: `main` at `1c97db3fb8264cbce7dd8bfa229cf7d47e510ab3`, with the local production YUV presenter work present in the dirty checkout. No production file was changed by this experiment. The Software YUV Wasm asset used was the existing `web/engine-software-yuv/player.wasm` (current SHA-256 `dacf9b5002784287d4f12b8b8c7f0ba929949551a4dabb437fca78eccbadad8f`). FFmpeg source in that build is 7.1.1; host FFmpeg 8.1.2 was used only for independent frame comparisons and directional decode timing.
- `page.html` instantiates the existing `WasmPlayer` and sends `set vd-lavc-o max_pixels=8294400,lowres=N` **before** `openRemote`. mpv applies that AVOption before `avcodec_open2`. The full arm leaves `lowres=0`. Both arms use the same Software engine and production YUV presenter; full decode is downscaled by the YUV presenter to the canvas target. `video-params` confirms the smaller **decoded** dimensions, so this is decoder reconstruction followed by presentation, not a post-decode-only downscale.
- Chrome 153.0.8010.53 on an AC-powered Apple M1/8 GiB macOS host. Fresh Chrome process per arm, two opposite-order rounds, 3 s warmup and about 6 s steady playback per arm. CPU is summed Chrome process CPU time divided by elapsed wall time; **100% = one core**. The later 4K and film runs check foreground identity; the first generated 1080p run did not. No simultaneous benchmark was intentionally run, but background host activity and Chrome browser-process CPU varied materially. Earlier failed harness starts and one interrupted 4K pilot remain in `results/decoder-lowres/` and are excluded from the table.
- Generated moving-pattern fixtures contain sharp grid/chroma edges and a small timestamp. Their SHA-256 values are `ac8bf15f...` (MPEG-2 1080), `1a3a11d2...` (MPEG-4 1080), and `23397bc7...` (MPEG-2 4K); exact commands are in `fixtures.sh` and full hashes and sizes are in [provenance.json](../../results/decoder-lowres/provenance.json). The 4K MPEG-2 stream is a generated stress fixture, not a claim that legacy 4K MPEG-2 is common. Film fixtures transcode a 24 s section of the [Big Buck Bunny 1080p sample](https://github.com/bower-media-samples/big-buck-bunny-1080p-60fps-30s) to 30 fps MPEG-2/MP2 and MPEG-4/MP3 using `bbb-fixtures.sh`. The sample is © 2008 Blender Foundation, CC BY 3.0. Fixture hashes: source `badb5340...`, MPEG-2 `abb07d85...`, MPEG-4 `3d35be2a...`.
- Quality reference: host FFmpeg full-resolution decode, then `scale=target:flags=lanczos+full_chroma_int` to RGB at the same target. `quality.py` compares three matched timeline frames at 3.2, 8.2 and 13.2 s. The browser `frame-diff.mjs` separately compares the production YUV presenter's paused exact-seek screenshots at 3 s, which include GPU scaling. RGB PSNR/MAE are descriptive; they are not a perceptual pass threshold. Host/Wasm FFmpeg versions differ, so the host quality results are corroborated, not replaced, by same-Wasm browser screenshots.

## Decoder inventory

`audit.py` intersects FFmpeg 7.1.1 decoder declarations, the Software FFmpeg `config_components.h`, and actual symbols in `build/link-maps/software-yuv.map`. **23 linked video decoders** advertise nonzero `max_lowres`:

| `max_lowres` | Linked decoders |
| ---: | --- |
| 5 | `jpeg2000` |
| 3 | `dvvideo`, `flv`, `h261`, `h263`, `h263p`, `mjpegb`, `media100`, `mjpeg`, `thp`, `mpeg1video`, `mpeg2video`, `mpegvideo`, `mpeg4`, `msmpeg4v1`, `msmpeg4v2`, `msmpeg4v3`, `wmv1`, `mxpeg`, `rv10`, `rv20`, `sp5x`, `amv` |

The exact generated inventory is in `results/decoder-lowres/audit.json`. `max_lowres=3` means nominal width/height divisors 2, 4 and 8. This inventory is capability, not a quality or playback qualification for the other 20 decoders. No separate equivalent reduced-reconstruction route was established for a decoder without `max_lowres`; skip-frame/skip-IDCT options do not supply a lower-resolution reconstructed frame.

## Whole-player results

Each CPU cell is round A / round B, not a pooled number; saving is computed against that round's **full decode + YUV presenter** CPU. Quality is the three-frame host full-decode/Lanczos PSNR range in dB, except the native-resolution control, which uses the same-Wasm browser screenshot PSNR. “Correct” means the requested YUV route, approximately 30 fps, no drops or audio underruns, forward/back exact seeks, pause, 1.5× rate and EOF passed. It does **not** mean visually identical.

| Codec | Source | Display target | Mode | Decoded size | CPU A / B | CPU saving A / B | Quality delta | Correct? |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| MPEG-2 | pattern 1080p | 960×540 | full | 1920×1080 | 61.8 / 56.1% | reference | reference | Yes |
| MPEG-2 | pattern 1080p | 960×540 | lowres=1 | 960×540 | 43.5 / 56.3% | +29.7 / −0.4% | 23.8–24.0 dB | Yes |
| MPEG-2 | pattern 1080p | 960×540 | lowres=2 | 480×270 | 20.4 / 52.2% | +67.0 / +7.0% | 20.5–20.6 dB | Yes, quality poor |
| MPEG-2 | pattern 1080p | 960×540 | lowres=3 | 240×135 | 55.3 / 41.0% | incomparable | 18.0–18.1 dB | **No YUV: odd-height RGB fallback** |
| MPEG-4 Part 2 | pattern 1080p | 960×540 | full | 1920×1080 | 25.2 / 54.1% | reference | reference | Yes |
| MPEG-4 Part 2 | pattern 1080p | 960×540 | lowres=1 | 960×540 | 40.8 / 64.4% | −62.3 / −19.0% | 23.6–23.8 dB | Yes |
| MPEG-4 Part 2 | pattern 1080p | 960×540 | lowres=2 | 480×270 | 48.8 / 57.4% | −94.0 / −6.0% | 20.3–20.5 dB | Yes, quality poor |
| MPEG-4 Part 2 | pattern 1080p | 960×540 | lowres=3 | 240×135 | 28.0 / 60.7% | incomparable | 18.0 dB | **No YUV: odd-height RGB fallback** |
| MPEG-2 | pattern 4K | 1920×1080 | full | 3840×2160 | 91.6 / 69.6% | reference | reference | Yes |
| MPEG-2 | pattern 4K | 1920×1080 | lowres=1 | 1920×1080 | 61.9 / 82.6% | +32.4 / −18.6% | 29.3–29.7 dB | Yes |
| MPEG-2 | pattern 4K | 1920×1080 | lowres=2 | 960×540 | 61.0 / 77.8% | +33.4 / −11.7% | 22.8–22.9 dB | Yes, quality poor |
| MPEG-2 | pattern 4K | 1920×1080 | lowres=3 | 480×270 | 66.3 / 65.9% | +27.6 / +5.4% | 19.2–19.3 dB | Yes, quality poor |
| MPEG-2 | film 1080p | 960×540 | full | 1920×1080 | 60.5 / 60.4% | reference | reference | Yes |
| MPEG-2 | film 1080p | 960×540 | lowres=1 | 960×540 | 55.8 / 61.1% | +7.7 / −1.1% | 36.4–46.2 dB | Yes |
| MPEG-2 | film 1080p | 960×540 | lowres=2 | 480×270 | 55.0 / 54.7% | +9.1 / +9.4% | 28.1–35.2 dB | Yes, visible detail loss |
| MPEG-4 Part 2 | film 1080p early scene | 960×540 | full | 1920×1080 | 65.8 / 59.3% | reference | reference | Yes |
| MPEG-4 Part 2 | film 1080p early scene | 960×540 | lowres=1 | 960×540 | 36.2 / 36.7% | +45.0 / +38.1% | 32.3–38.0 dB | Yes |
| MPEG-4 Part 2 | film 1080p early scene | 960×540 | lowres=2 | 480×270 | 49.3 / 58.5% | +25.0 / +1.4% | 26.7–33.0 dB | Yes, visible detail loss |
| MPEG-4 Part 2 | film 1080p later scene | 960×540 | full | 1920×1080 | 36.3 / 47.5% | reference | reference | Yes |
| MPEG-4 Part 2 | film 1080p later scene | 960×540 | lowres=1 | 960×540 | 55.6 / 54.5% | −53.4 / −14.6% | 32.3–38.0 dB across film | Yes |
| MPEG-2 | pattern 1080p | **1920×1080 control** | full | 1920×1080 | 62.0% | reference | reference | Yes |
| MPEG-2 | pattern 1080p | **1920×1080 control** | lowres=1 | 960×540 | 50.8% | +18.1% | **22.0 dB** | Playback yes; fidelity poor |

Raw runs: [generated 1080p](../../results/decoder-lowres/2026-09-23T22-39-11.027Z/result.json), [4K](../../results/decoder-lowres/2026-09-23T22-46-42.191Z/result.json), [native control](../../results/decoder-lowres/2026-09-23T22-49-56.628Z/result.json), [film early scene](../../results/decoder-lowres/2026-09-23T22-52-50.679Z/result.json), [film later scene](../../results/decoder-lowres/2026-09-23T22-59-23.076Z/result.json), [pattern/4K quality](../../results/decoder-lowres/quality/result.json), [film quality](../../results/decoder-lowres/quality/bbb-result.json). The generated 1080p whole-player run predates the foreground check, so its CPU numbers are exploratory.

### Attribution, uploads and memory

- Chrome process CPU is not a stable decoder proxy. For 4K MPEG-2 lowres=1, renderer+GPU CPU fell from 56.9 to 31.6 core points in round A and from 64.2 to 45.6 in round B, while total CPU changed from 91.6→61.9% and 69.6→82.6%, respectively. The browser process itself varied from 2.9 to 40.8 core points across the 4K arms. On film MPEG-4, the early-scene 38–45% total saving came almost entirely from browser-process CPU dropping to 0.3 core points; renderer+GPU stayed about 34–36. In the later scene, total lowres CPU was **higher**, again due mainly to browser-process variation. This is measured whole-Chrome behavior, but it cannot be attributed to reduced decoder work without further tracing.
- There is no direct FFmpeg-thread timer in this Wasm build. A **directional, non-Demuxe** host FFmpeg 8.1.2 decode-to-null check (`host-decode.py`, two opposite-order rounds, 2 threads) saved only **5.9–7.9%** user+system CPU for film MPEG-2 lowres=1, **7.6–8.0%** for film MPEG-4, and **12.3–15.0%** for 4K MPEG-2. Lowres=2 saved 24.6–28.4% but failed the visual comparison on difficult frames. Host version, threading and lack of mpv/browser work prevent treating these as Wasm decoder CPU figures.
- YUV upload and plane-copy bytes per frame fell with decoded area: 1080p full 3,110,400; lowres=1 777,600; lowres=2 194,400. For 4K: full 12,441,600; lowres=1 3,110,400; lowres=2 777,600; lowres=3 194,400. The measured 4K Wasm heap was about 193 MB full, 161 MB at lowres=1, and 134 MB at lowres=2/3. At 1080p all arms retained a 134 MB heap floor. Presenter render-call wall time fell for 4K full→lowres=1 from 3.38→1.05 ms/frame (round A) and 3.71→1.40 (round B); this timer contains presentation callbacks, **not** decoder CPU.

### Visual and behavior checks

- Production YUV paused screenshots at the same exact seek confirm the trend within the **same Wasm decoder**: 1080p generated MPEG-2/MPEG-4 lowres=1 about 22.2 dB PSNR; 4K MPEG-2 lowres=1 29.1 dB; early film lowres=1 38.3 dB MPEG-2 and 37.6 dB MPEG-4. Browser PNG metrics are in each run's `frame-diff.json`.
- Visual inspection of the generated grids, timestamp, diagonal motion and saturated chroma edges shows softer/shifted edges at lowres=1, much larger loss at lowres=2/3. Film lowres=1 preserves broad scene appearance but softens fine foliage and grass; MPEG-4 at 13.2 s has 32.3 dB host PSNR and about 3.5/255 mean absolute RGB error. Lowres=2 loses obvious grass/tree detail. This is content-dependent: the edge pattern is a useful failure probe but not a representative quality average for the film.
- FFmpeg's source uses reduced IDCT kernels and a separate lowres motion-compensation path with changed motion-vector precision and chroma operations; reference pictures are reconstructed at the selected lower resolution. Thus lowres changes the reference reconstruction loop and can accumulate differences across predicted frames. The pixel comparisons observe the combined effect; they do not isolate MC from IDCT or chroma filtering. Exact forward/back seeks, 1.5× playback and EOF passed in the measured arms, with zero reported drops and audio underruns. Long-GOP drift, interlace and alternate chroma formats were not exercised.
- mpv reported 16:9 display aspect, 1:1 pixel aspect, and full visible source crop at every measured level. For 1920×1080, lowres=3 becomes **240×135**, which the production YUV guard rejects as an odd-height planar source; playback continues through RGB fallback. The test does not qualify arbitrary coded/visible crop differences or anamorphic metadata.

## Policy answer

The only source/display geometry worth further investigation is **2:1 in each axis at lowres=1** (1080p→540p or 4K→1080p). That is a *candidate ratio*, not a working Auto threshold: film MPEG-2 showed −1.1 to +7.7% whole-Chrome saving, 4K MPEG-2 changed from +32.4 to −18.6%, and MPEG-4 film changed from +38–45% in an early scene to −15–53% in a later scene. The decoder-only host proxy was a modest 6–15% at level 1. Lowres=2/3 exceed target reduction, damage detail, and offer no robust whole-player benefit; 1080p lowres=3 also leaves the YUV route. The native-resolution control demonstrates why merely admitting `max_lowres` without a target-size gate is unacceptable.

Keep Auto on full decode + YUV presentation. A later explicit approximate mode would need repeatable whole-player CPU attribution and content-sensitive quality gates, including sharp text/chroma and long-GOP motion, before it could justify any narrow automatic admission.

**CORRECTNESS/QUALITY BLOCKER**
