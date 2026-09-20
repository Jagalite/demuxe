<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Why Demuxe selected Hybrid

This is the **before-change** 17-case audit. The later [component-routing report](COMPONENT-ROUTING.md) records plain external WebVTT moving to Native and preserves the remaining gates.

> **Historical snapshot.** This audit predates Shaka/MSE production streaming.
> Its Hybrid streaming ownership/reasons and CPU evidence apply only to the
> recorded artifacts. See [current streaming architecture](STREAMING.md) and
> fresh route evidence in the main catalogue.

All **17 Hybrid rows in this snapshot** are qualified below: seven audio-related, seven subtitle-related, and three manifest/timeline-related. Reasons describe the tested browser and exact source snapshots; they are not universal format-support claims.

## What Hybrid owns

| Component | Native | Hybrid in these records |
| --- | --- | --- |
| Video decode | Browser media element | Browser WebCodecs; decoded frames observed in all 17 rows |
| Demux / stream handling | Browser, or packet-copy preparation for Native remux | mpv/FFmpeg |
| Audio | Browser decode/output | mpv/FFmpeg decode and PCM output through AudioWorklet |
| Subtitles | Browser text tracks or an explicitly enabled overlay | mpv/libass for text; mpv bitmap handling for PGS/VobSub |

A subtitle-only blocker still sends **all audio** through mpv in the current Hybrid architecture. WebCodecs does not prove hardware acceleration; the recorded request uses `no-preference`.

## Each Hybrid combination

| Media | Result | Component preventing Native | Native direct / remux explanation | Evidence |
| --- | --- | --- | --- | --- |
| H.264 + PCM24 / MKV + ASS | Passed | External ASS subtitle API | Default addSubtitle(File) selected the mpv subtitle path; native subtitle plans were not admitted. Remux does not remove the subtitle API requirement. | [record](../results/head-to-head/demuxe-hybrid-original-audit-01/demuxe.auto.pcm-ass/result.json) |
| H.264 + AC-3 5.1 / MKV | Screen only | AC-3 audio | Native presented video; selected-audio output verification failed. MSE rejected the combined MP4 packaging. Separate hints: video accepted, audio rejected. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-ac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV | Screen only | E-AC-3 audio | Native presented video; selected-audio output verification failed. MSE rejected the combined MP4 packaging. Separate hints: video accepted, audio rejected. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-eac3/result.json) |
| H.264 + DTS core 5.1 / MKV | Screen only | DTS audio / Demuxe packaging | Native presented video; selected-audio output verification failed. DTS has no Demuxe packet-copy audio construction contract; Native remux was not attempted. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-dts/result.json) |
| HEVC Main 10-bit SDR + AC-3 / MKV | Passed | AC-3 audio | Native presented video; selected-audio output verification failed. MSE rejected the combined MP4 packaging. Separate hints: video accepted, audio rejected. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.hevc10-ac3/result.json) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | Passed | E-AC-3 audio | Native presented video; selected-audio output verification failed. MSE rejected the combined MP4 packaging. Separate hints: video accepted, audio rejected. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.hevc10-eac3/result.json) |
| HEVC Main 10-bit SDR + DTS core / MKV | Passed | DTS audio / Demuxe packaging | Native presented video; selected-audio output verification failed. DTS has no Demuxe packet-copy audio construction contract; Native remux was not attempted. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.hevc10-dts/result.json) |
| H.264 + AAC + embedded SRT / MKV | Passed | Embedded SRT subtitles | Skipped: embedded subtitle delivery requires mpv rendering under the current selection policy. Skipped by the same subtitle gate; packet-copy preparation does not provide the required subtitle presentation. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-srt/result.json) |
| H.264 + AAC + external WebVTT / MP4 | Passed | External WebVTT subtitle API | Default addSubtitle(File) selected the mpv subtitle path; native subtitle plans were not admitted. Remux does not remove the subtitle API requirement. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-vtt/result.json) |
| H.264 + AAC + embedded mov_text / MP4 | Passed | Embedded mov_text subtitles | Skipped: embedded subtitle delivery requires mpv rendering under the current selection policy. Skipped by the same subtitle gate; packet-copy preparation does not provide the required subtitle presentation. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-movtext/result.json) |
| H.264 + AAC + styled ASS / MKV | Passed | Embedded ASS subtitles | Skipped: embedded subtitle delivery requires mpv rendering under the current selection policy. Skipped by the same subtitle gate; packet-copy preparation does not provide the required subtitle presentation. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-ass/result.json) |
| HEVC + AC-3 + PGS / MKV | Failed | Embedded PGS subtitles | Skipped: embedded subtitle delivery requires mpv rendering under the current selection policy. Skipped by the same subtitle gate; packet-copy preparation does not provide the required subtitle presentation. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.hevc-pgs/result.json) |
| H.264 + AC-3 + VobSub / MKV | Passed | Embedded VobSub subtitles | Skipped: embedded subtitle delivery requires mpv rendering under the current selection policy. Skipped by the same subtitle gate; packet-copy preparation does not provide the required subtitle presentation. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.h264-vobsub/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | Screen only | E-AC-3 audio | Native presented video; selected-audio output verification failed. MSE rejected the combined MP4 packaging. Separate hints: video accepted, audio rejected. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.hdr10-hevc/result.json) |
| H.264 + AAC / DASH VOD (fMP4 segments) | Failed | DASH manifest integration | Skipped: manifest track requirements require mpv inspection under current routing. Skipped: Native file preparation is not qualified for manifest sources. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.dash-h264/result.json) |
| AV1 + Opus / DASH VOD (WebM segments) | Passed | DASH manifest integration | Skipped: manifest track requirements require mpv inspection under current routing. Skipped: Native file preparation is not qualified for manifest sources. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.dash-av1/result.json) |
| H.264 + AAC / HLS live (sliding window) | Passed | Live timeline policy | Skipped: live manifest timelines require mpv inspection under current routing. Skipped: Native file preparation is not qualified for manifest sources. | [record](../results/head-to-head/demuxe-hybrid-audit-01/demuxe.auto.hls-live/result.json) |

## What the evidence does and does not establish

- **AC-3 / E-AC-3:** the captured Native failure has presented video but no verified audio output. Separate MSE hints accept the video configuration and reject the audio and combined packaging. This isolates the observed failure to the audio path on this browser, not H.264/HEVC support.
- **DTS:** Native audio verification failed; Demuxe also lacks a DTS packet-copy construction contract. No hypothetical DTS MSE packaging was treated as tested.
- **Subtitle rows:** Native was excluded by a rendering/API requirement. Those gates do not establish codec incompatibility. External WebVTT is a concrete integration candidate: the file API selects mpv, while a separate browser-text-track API exists.
- **DASH and live HLS:** Native was excluded by current manifest/timeline policy. The HLS VOD routing fix is already reflected in the main table; those three VOD cases are Native and are intentionally absent here.
- **Recovery diagnostics:** the final audio rows say direct playback requires controlled remux. The fresh trace shows this is a recovery stage after Native audio failed, not a custom transport request from the harness.
- **Remaining correctness limits:** failures remain failures in the table; the reason is retained in each record. Three surround screens do not qualify discrete channels, and the HDR screen does not qualify display fidelity.

The relevant implementation is [Native semantic selection](../src/internal/selection.ts), [plan admission](../src/internal/playback-plans.ts), and [subtitle-file / browser-track APIs](../src/unified-player.ts).

## Per-row scope and follow-up

### H.264 + PCM24 / MKV + ASS

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv/libass text rendering.

- Native ASS is opt-in and was not enabled. The original Native + host ASS result uses a separate explicit overlay; it is not built-in Native ASS qualification.

### H.264 + AC-3 5.1 / MKV

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.
- Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.

### H.264 + E-AC-3 5.1 / MKV

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.
- Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.

### H.264 + DTS core 5.1 / MKV

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- DTS browser/MSE support was not established; a Demuxe packaging exclusion is not a browser codec verdict.
- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.
- Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.

### HEVC Main 10-bit SDR + AC-3 / MKV

Video: Browser WebCodecs: hev1.2.4.L60.90. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.

### HEVC Main 10-bit SDR + E-AC-3 / MKV

Video: Browser WebCodecs: hev1.2.4.L60.90. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.

### HEVC Main 10-bit SDR + DTS core / MKV

Video: Browser WebCodecs: hev1.2.4.L60.90. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- DTS browser/MSE support was not established; a Demuxe packaging exclusion is not a browser codec verdict.
- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.

### H.264 + AAC + embedded SRT / MKV

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv/libass text rendering.

- This is a subtitle integration/selection boundary, not proof that the video or audio codec is browser-incompatible.

### H.264 + AAC + external WebVTT / MP4

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv/libass text rendering.

- The harness uses addSubtitle(File), not the separate addTextTrack browser API. Plain Native WebVTT passed. A Demuxe addTextTrack comparison remains to be run; do not label WebVTT inherently non-native.

### H.264 + AAC + embedded mov_text / MP4

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv/libass text rendering.

- This is a subtitle integration/selection boundary, not proof that the video or audio codec is browser-incompatible.

### H.264 + AAC + styled ASS / MKV

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv/libass text rendering.

- This is a subtitle integration/selection boundary, not proof that the video or audio codec is browser-incompatible.

### HEVC + AC-3 + PGS / MKV

Video: Browser WebCodecs: hev1.2.4.L60.90. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv bitmap decoding/compositing.

- This is a subtitle integration/selection boundary, not proof that the video or audio codec is browser-incompatible.
- AC-3 audio may independently limit Native, but this fixture hit the subtitle gate before an isolated audio trial.
- Hybrid still failed the required bitmap marker; routing to the subtitle-capable backend did not establish correct PGS output.
- Error: Required marked subtitle drawing missing

### H.264 + AC-3 + VobSub / MKV

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: mpv bitmap decoding/compositing.

- This is a subtitle integration/selection boundary, not proof that the video or audio codec is browser-incompatible.
- AC-3 audio may independently limit Native, but this fixture hit the subtitle gate before an isolated audio trial.

### HEVC Main 10 + E-AC-3 / MKV (HDR10)

Video: Browser WebCodecs: hev1.2.4.L60.90. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.
- HDR tagging is not the observed routing blocker. Reference HDR transfer, tone mapping and display fidelity remain unqualified.
- Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified.

### H.264 + AAC / DASH VOD (fMP4 segments)

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- This is a manifest/timeline routing boundary; WebCodecs decoded the video. It does not establish an audio/video codec rejection by Native.
- Hybrid failed a command timeout; the failure cause is not resolved by the routing explanation.
- page.evaluate: PlayerError: Command timed out

### AV1 + Opus / DASH VOD (WebM segments)

Video: Browser WebCodecs: av01.0.00M.08. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- This is a manifest/timeline routing boundary; WebCodecs decoded the video. It does not establish an audio/video codec rejection by Native.

### H.264 + AAC / HLS live (sliding window)

Video: Browser WebCodecs: avc1.64000d. Audio: mpv/FFmpeg → PCM → AudioWorklet. Subtitles: None requested.

- This is a manifest/timeline routing boundary; WebCodecs decoded the video. It does not establish an audio/video codec rejection by Native.
- The bounded sliding-window screen passed. Native live-HLS equivalence and long-running recovery are not qualified.

## Reproduce and inspect

[Structured component audit](../results/head-to-head/hybrid-qualification-01/analysis.json) · [Generator](../results/head-to-head/hybrid-qualification-01/files/explain-hybrid.py) · [MSE hint probes](../results/head-to-head/hybrid-mse-probes-01/result.json)

The correctness adapter retains selection events and observes/rethrows Native output-verification failures without changing route choice. These are intrusive correctness observations, not performance measurements. Each linked run retains its frozen harness and asset identities.

Run `tests/head-to-head/explain-hybrid.py` with ordered `--run` arguments (latest matching case wins), `--probes` and a fresh `--output`. The generator verifies every run and fails if a Hybrid row lacks an explanation or the audio failure evidence.
