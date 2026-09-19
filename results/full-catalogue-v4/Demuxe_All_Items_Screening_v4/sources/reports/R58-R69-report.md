# Demuxe R58–R69 research report

**Baseline:** `Jagalite/demuxe@9abfd1b22300cf273fc0bd1a8290261281c8f3f3`  
**Run date:** 2026-09-17  
**Environment:** Chromium 144.0.7559.96 (Debian 13), FFmpeg 7.1.5, Python 3.13.5, Node v22.16.0.

## Outcome summary

| Card | Status | Result |
|---|---|---|
| R58 | **PROMISING** | Same video SourceBuffer survived H.264 → VP9 → H.264 with continuous AAC; invalid codec negative control rejected. |
| R59 | **PROMISING** | Equal-size moov edit removed the unselected audio trak without changing mdat bytes; retained track played through seek, EOF and source replacement. |
| R60 | **BLOCKED** | Could not produce a trusted H.264 A/53/CEA-608 in-band fixture with this FFmpeg build; synthetic untrusted SEI was not accepted as evidence. |
| R61 | **PROMISING** | Six-channel Web Audio matrix preserved channel-index signatures in direct and split-MSE paths; 0.25 gain measured ~0.25 RMS ratio. |
| R62 | **PROMISING** | Audio-only timestampOffset shifted audio ±250 ms while video buffer stayed unchanged; paused remove/reappend changed delay without replacing SourceBuffers. |
| R63 | **INCONCLUSIVE** | Browser decoded standalone JPEG-like MJPEG packets under bounded concurrency, but the generated AVI packets already contained DHT and no AVI1 marker, so the default-Huffman adapter edge was not exercised. |
| R64 | **PROMISING** | lowres=2 cut decode CPU about 75% for MJPEG and MPEG-2 at 320×180; preview quality loss was material, especially MJPEG, so this is preview-only. |
| R65 | **PROMISING** | Selected H.264/AAC program stayed byte-identical when program declarations were reordered and played even though the unrelated AC-3 program was unsupported; AAC needed a normalization pass before fragmentation. |
| R66 | **INCONCLUSIVE** | Setting currentTime before metadata was robust and honored replacement/out-of-range/cancel cases, but Blob testing showed no meaningful startup latency win. |
| R67 | **PROMISING** | Releasing four paused media presentations cleared media buffers and reduced aggregate Chromium RSS by ~163.8 MiB in this run; restore resumed near the saved frame. |
| R68 | **INCONCLUSIVE** | Selective PCM was bit-exact and copied 140/150 FLAC packets, but the qualified three-process orchestration was ~2.4× CPU and ~2.6× wall-time slower than full render. |
| R69 | **NOT WORTH COMPLEXITY** | Audit found the only same-config reconfigure is a semantic decoder reset; fingerprint-skipping it risks stale reference/reorder state, so the backlog skip rule applies. |

Status totals: **7 PROMISING**, **3 INCONCLUSIVE**, **1 BLOCKED**, **1 NOT WORTH COMPLEXITY**.

## Test environment and interpretation

The managed Chromium installation blocked normal `file:`/HTTP navigation with a URL blocklist, so browser media tests used the same Chromium binary on `about:blank` and injected fixture bytes as in-memory `Blob` objects. That page was not a secure context, so `VideoDecoder` and `ImageDecoder` were not exposed there. Cards were not failed merely because an optional browser API was unavailable; the exact card-specific gate was applied instead. MSE, `SourceBuffer.changeType`, Web Audio, `createImageBitmap`, and normal media-element playback were available.

All measurements below are pilot results for this pinned environment, not cross-browser guarantees.

## R58 — Cross-codec SourceBuffer transition — PROMISING

A single video `SourceBuffer` was changed H.264 → VP9 → H.264 while one AAC audio buffer remained continuous. The video buffered range progressed `[0, 1.999999]` → `[0, 4.0]` → `[0, 5.999999]`; AAC remained `[0, 6.021333]`. Frame samples were red, green and blue in the three epochs and the audio peak stayed ~441.43 Hz. An intentionally invalid codec change raised `NotSupportedError`, after which H.264 could be restored.

The H.264 fixture uses no B-frames so decode/display timestamp lead does not masquerade as a transition gap. This is good evidence that `changeType()` is viable for this controlled H.264/VP9 case, but more real-world codec/profile combinations still belong in compatibility coverage.

Evidence: `results/r58_browser.json`, `scripts/r58_browser.py`.

## R59 — Metadata-only selected-track MP4 view — PROMISING

The pilot replaces the unselected audio `trak` inside `moov` with an equal-size `free` box and enables the retained audio track. File size is unchanged in both moov-at-tail and faststart layouts, and every `mdat` hash remains identical before/after. The original files play ~438.74 Hz; both edited views play the retained ~880.17 Hz track, keep that track after a seek near 4.4 s, reach EOF normally, and survive replacement between the two edited sources on one media element.

This demonstrates the core idea without media-payload rewriting. The implementation must still treat MP4 box structure, track flags, offsets and malformed inputs defensively.

Evidence: `results/r59_*`, `scripts/r59_edit.py`, `scripts/r59_browser.py`.

## R60 — In-band captions — BLOCKED

The local FFmpeg build can decode EIA-608/CEA-708 and can emit SCC-derived subtitle packets, but no trustworthy path was found to inject those captions as H.264 A/53/CEA-608 user data for a controlled fixture. The attempted mux produced separate caption data rather than verified per-frame A/53 caption side data; the visible H.264 SEI was unrelated user-data-unregistered metadata.

Because the card requires a trusted caption fixture/oracle, a hand-built synthetic SEI would not be sufficient evidence. This is an environment/fixture blocker, not evidence that the playback design fails.

Evidence: `results/r60_*`, `fixtures/r60_test.scc`.

## R61 — Native channel matrix effects — PROMISING

An offline six-channel matrix test produced RMS ~0.14142 per channel at identity and ~0.03536 for channel index 2 with gain 0.25. Direct media playback and split-MSE playback both preserved the independent frequency signatures (roughly 220/330/440/[suppressed LFE]/660/770 Hz), with channel index 2 measuring ~0.0282 RMS against ~0.1132 on active reference channels — essentially the requested 0.25 ratio in both paths.

The test deliberately treats these as **channel indices**, not inferred speaker labels; the LFE stimulus is strongly attenuated by the encoded path and does not justify semantic channel naming by itself.

Evidence: `results/r61_browser.json`, `results/r61_ffmpeg_channels.json`, `scripts/r61_browser.py`.

## R62 — Split-MSE audio delay — PROMISING

With video and audio in independent SourceBuffers, `timestampOffset=+0.25` moved audio to `[0.25, 6.271333]` while video remained `[0.066666, 6.066666]`; `-0.25` moved the audio start to zero/truncated the early negative portion while video stayed unchanged. Measured impulse trains moved consistently with the offset (plus the analyser window's constant observation delay).

While paused, removing/reappending only audio with a +0.5 s offset yielded `[0.5, 6.521333]`. The video range was unchanged, and both SourceBuffer object identities were retained.

Evidence: `results/r62_browser.json`, `scripts/r62_browser.py`.

## R63 — MJPEG via ImageBitmap — INCONCLUSIVE

`createImageBitmap` successfully decoded the extracted 640×360 packet and the `mjpeg2jpeg` form under a concurrency limit of two. In this run median decode time was ~5.75 ms for the raw extracted packet and ~2.60 ms for the `mjpeg2jpeg` form; 30-image bursts completed in ~49–50 ms with peak concurrency 2. Browser-rendered pixels differed only modestly from the FFmpeg reference (mean absolute RGB difference about 2.29/1.27/1.74).

However, the source packet already contains JFIF and DHT markers and no `AVI1` marker. Therefore the important AVI1/default-Huffman-table repair edge was **not actually exercised**. The browser path works for JPEG-like MJPEG packets, but the card remains inconclusive until a genuine AVI1/no-DHT fixture is available.

Evidence: `results/r63_browser.json`, `scripts/r63_browser.py`.

## R64 — Decoder lowres previews — PROMISING

Both codecs produced 320×180 output with decoder lowres level 2. Median results:

| Codec | Full decode + scale CPU | lowres=2 CPU | CPU reduction | Full wall | lowres wall | Same-size quality |
|---|---:|---:|---:|---:|---:|---|
| MJPEG | 1.465s | 0.358s | 75.6% | 0.612s | 0.326s | SSIM 0.885, PSNR 29.1 dB |
| MPEG-2 | 1.234s | 0.304s | 75.4% | 0.421s | 0.150s | SSIM 0.945, PSNR 29.1 dB |

The CPU saving is large, but the MJPEG visual loss in particular is not subtle. Treat decoder lowres as a **preview/thumbnail optimization**, not a full-quality playback path.

Evidence: `results/r64_bench.json`, `scripts/r64_bench.py`.

## R65 — Selective MPEG-TS program remux — PROMISING

The fixture contains program 100 (red H.264 + 440 Hz AAC) and program 200 (blue H.264 + 880 Hz AC-3). AC-3 MSE support is false in this Chromium, but selecting program 100 produces red video and ~441.43 Hz audio with no media error. Reversing program declaration order changes neither behavior nor selected packet output: all **433** selected A/V packets match exactly in mux order (150 video, 283 audio).

A direct TS → `empty_moov` AAC copy did not provide initialization extradata acceptable to Chromium. The working host path first packet-copies the selected program into regular MP4 to normalize AAC configuration, then packet-copies into fragmented split video/audio MP4. That is still media-packet copy, but currently a two-stage packaging operation.

Evidence: `results/r65_browser.json`, `results/r65_packet_compare.json`, `results/r65_ffprobe_programs.txt`, `scripts/r65_browser.py`.

## R66 — Early start-position assignment — INCONCLUSIVE

Assigning `currentTime=8` immediately after setting the Blob source is valid in Chromium and the first presented frame is ~8.033 s. The conventional load-then-seek path presents the same frame. Across five runs, median first-frame time from source setup was ~235.7 ms for load-then-seek versus ~227.6 ms for early assignment; this small difference is not a meaningful win in the in-memory Blob setup. Median preparation time was ~90.6 vs ~99.6 ms.

Edge cases were conservative: an out-of-range target 30 s clamps to the 16 s duration without an exception; replacing the source immediately honors only the replacement target (4 s); cancelling leaves `readyState=0` and no buffered media. Early assignment may avoid a transient time-zero presentation/extra host seek, but this test does not demonstrate range-request or startup savings.

Evidence: `results/r66_browser.json`, `results/r66_edges.json`, `scripts/r66_browser.py`, `scripts/r66_edges.py`.

## R67 — Presentation hibernation — PROMISING

Four 720p presentations were paused around 1.73 s and retained their full `[0,20]` buffers during the short-pause control. The hibernation policy snapshots time/playback settings and a ~6 KB JPEG still, removes the media sources, calls `load()`, revokes the shared Blob URL, and retains one 6.79 MiB encoded source byte array for restoration. Media elements report `readyState=0` and zero buffered ranges after release (Chromium may leave the revoked Blob string in `currentSrc`, so that string is not used as the release oracle).

Aggregate Chromium RSS dropped from 692.8 MiB to 529.0 MiB, a reduction of ~163.8 MiB in this headless run. Restoration took ~878 ms and the first frame reported mediaTime 1.733333 s, close to the saved positions.

RSS is allocator/process/environment dependent; the durable result is the explicit lifecycle policy and buffer release, not a guaranteed byte saving.

Evidence: `results/r67_browser.json`, `scripts/r67_browser.py`.

## R68 — Selective crossfade bridge — INCONCLUSIVE

The selective construction copies 70 FLAC packets before the bridge, decodes/mixes/re-encodes a 10-packet 0.96 s bridge, then copies 70 packets after it. The decoded PCM output is **bit-exact** to the full FFmpeg acrossfade reference: both have SHA-256 `2901de78cb3722ccc2dcc50f2806efddacdc1e311b220448bd35ea1e446958d5` over 691200 frames, with max and mean absolute difference 0. MSE accepts the three pieces on one audio SourceBuffer and signal checks see 440 Hz before, both components in the bridge, and 880 Hz after.

The qualified implementation is not a performance win yet. Median full-render CPU/wall were 0.333/0.305 s; the current three-process selective orchestration was 0.808/0.799 s, or **2.43× CPU** and **2.62× wall time**. Correctness is proven; the host/process architecture needs to remove launch/probe overhead before selective work is worth adopting.

Evidence: `results/r68_pcm_compare.json`, `results/r68_packet_hashes.json`, `results/r68_browser.json`, `results/r68_bench.json`, `scripts/r68_browser.py`, `scripts/r68_bench.py`.

## R69 — Configuration fingerprints — NOT WORTH COMPLEXITY

The backlog's audit gate closes this card without a benchmark. `native/vd_browser.c` configures the browser decoder at creation and calls operation 6 from the decoder's `reset()` path. That reset also clears replay state, flushes software decoder buffers, resets delivered/recovery/keyframe state, and resets the decoder wrapper state. Both browser decoder workers implement operation 6 by clearing/closing the decoder before configuring it again. In addition, changed packet extradata is explicitly compared against the active codec extradata and triggers fallback rather than silent reuse.

Therefore the observed same-configuration reconfigure is **not a harmless duplicate**: it is part of a semantic seek/reset boundary. A fingerprint that skips it could preserve stale reference/reorder state. Per the card's own skip rule, no optimization or timing benchmark was pursued.

Evidence: `results/r69_audit.json`; audited source blobs are pinned there to the baseline commit.

## What the run says about implementation work

The run provides direct pilot evidence for R58, R59, R61, R62, R64, R65 and R67. Each still needs production hardening and broader browser/fixture coverage, especially R64's preview-quality tradeoff and R65's two-stage AAC packaging detail.

R63 needs the missing AVI1/no-DHT fixture before the adapter claim can be tested. R66 is useful as a correctness simplification but not yet as a measured performance optimization. R68 should not be adopted for performance in its current orchestration despite exact correctness. R60 should be resumed only when a trusted in-band caption fixture can be generated or sourced. R69 should remain closed unless the decoder lifecycle changes and a genuinely redundant harmless reconfigure appears.

## Reproduction and integrity

- Fixture generation: `scripts/generate_fixtures.sh`
- Individual browser/benchmark scripts: `scripts/r58_browser.py` through the card-specific scripts present in `scripts/`
- Raw result JSON/text: `results/`
- Exact fixture hashes: `FIXTURES.sha256`
- Evidence-file hashes: `MANIFEST.sha256`

The evidence archive intentionally omits the ~39 MiB fixture payloads; the generator plus `FIXTURES.sha256` records the exact expected fixtures while keeping the bundle small.