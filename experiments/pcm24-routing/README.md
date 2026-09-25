# PCM24 routing experiment

Production source and routing are untouched. `prepare.py` snapshots the current built runtime, hashes it, and admits only `pcm_s24le` in the two existing selective-audio codec checks (admission and asset discovery). It also creates isolated no-draw and PCM-capture runtimes. The player, audio clock, epoch/rate synchronization, PCM rings and worklets otherwise remain unchanged.

From the repository root:

```sh
python3 experiments/pcm24-routing/prepare.py
node experiments/pcm24-routing/run.mjs correctness
ARMS=flac RESULT_SUFFIX=flac-recheck node experiments/pcm24-routing/run.mjs correctness
node experiments/pcm24-routing/run.mjs fidelity
ffmpeg -nostdin -v error -y -i build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv -map 0:a -f f32le build/pcm24-routing/reference.f32
python3 experiments/pcm24-routing/check-pcm.py
ffmpeg -nostdin -v error -y -i build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv -map 0 -c copy -movflags +faststart build/pcm24-routing/pcm-copy.mp4
node experiments/pcm24-routing/browser-audio.mjs
python3 experiments/pcm24-routing/check-browser-pcm.py
node experiments/pcm24-routing/run.mjs cpu
```

CPU uses the existing headed Chrome benchmark helper, completed macOS hardware-key task gate, 20-second initial idle, fresh contexts and 2-second inter-arm idle, 5-second warmup, and 20-second CPU windows with 2-second samples. Three counterbalanced rounds share one declared Chrome lifetime. Idle CPU is retained and is not subtracted. CPU-only arms contain no PCM sample capture. Audio-off and no-draw are diagnostic ablations and must not be called correct playback.

The initial FLAC lifecycle run missed the rate tolerance in a short 1.8-second interval; it is retained. The repeat uses 3-second intervals to reduce the effect of published-state sampling cadence. No production behavior or acceptance tolerance was changed. Missing-font and single-admission-edit failed setup runs are retained separately and excluded.

`PCM_FIXTURE` can select a different local file, but the lifecycle seek positions require a duration over 36 seconds. This study is only a bounded fixture screen, not broad codec/browser qualification. Bit-exact checks apply to normal-speed digital samples before the device mixer, not time-stretched or physical output. Sync is the existing reported output-clock estimate, not an external audiovisual capture.

Summarize the completed campaign with `python3 experiments/pcm24-routing/summarize.py`. `finalize.py` validates all 18 CPU rows and browser-block cleanup, then inserts the measured table into the report draft; run it only once against a draft report. The checked-in-style report here is already finalized.
