# Quick native FFmpeg AAC / AC-3 comparison

FFmpeg 8.1.2 on this Apple M1, explicitly selecting the native software `aac` and `ac3` decoders. Matching stereo 48 kHz audio comes from the identical-video investigation: AC3 is the original source, and AAC is its previously encoded derivative. Both tracks were stream-copied into audio-only Matroska files. No video decoding or hardware audio decoder was used.

Each trial loops the 36-second input 100 times and decodes to stereo 48 kHz interleaved float32 PCM with the null muxer. Decoder threads and filter threads are set to one; FFmpeg CLI demux/output infrastructure can still run other threads. Both sources are warmed once, followed by three measurements each in AAC/AC3, AC3/AAC, AAC/AC3 order. The metric is total FFmpeg process user plus system CPU time divided by reported output timeline duration. It includes demux, decode, PCM conversion, and output plumbing; it is not a decoder-function microbenchmark or real-time audio-device playback.

| Codec | Trial CPU ms / media second | Median CPU ms / media second |
| --- | --- | ---: |
| AAC | 1.333, 1.584, 1.327 | 1.333 |
| AC3 | 0.948, 0.949, 0.941 | 0.948 |

AC3 used about 28.9% less CPU time per media second than AAC in this quick native test. Both decoded far faster than real time. Each trial processed about one hour of output timeline in only a few wall-clock seconds; AAC's encoder/container padding produces about 3603 seconds versus 3600 for AC3, and each result is normalized by its own reported duration.

This does not support intrinsically expensive AC3 decoding as the explanation for the browser route gap. It does not prove the deployed Wasm decoder has the same behavior: the native FFmpeg build, SIMD support and runtime differ, and this unpaced workload does not include browser scheduling, the PCM AudioWorklet or A/V synchronization. Native FFmpeg process CPU accounting and codec rankings here must not be substituted for browser CPU percentages.

All commands, user/system/wall times and progress durations are in `result.json`; per-trial logs show `aac (native)` / `ac3 (native)` to `pcm_f32le (native)`. `ffmpeg-version.txt` retains the complete native build configuration, including NEON support. `probe.py` is the exact script. No production code, README rows or media source files were modified.
