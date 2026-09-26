# MediaBunny player: first four Demuxe catalogue rows

Date: 2026-09-25 local / 2026-09-26 UTC. Browser: Google Chrome 153.0.8010.53 on macOS, headless with autoplay enabled. Player: live [official MediaBunny player example](https://mediabunny.dev/examples/media-player/). Its deployed script was `/assets/media-player-CTo43hWk.js`, SHA-256 `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`. The site's bundled MediaBunny version was not independently verified; npm's latest version was 1.60.0 at test time. The [v1.60.0 example source](https://github.com/Vanilagy/mediabunny/blob/v1.60.0/examples/media-player/media-player.ts) uses `CanvasSink` and `AudioBufferSink` for timed playback.

The [qualification runner](../benchmark/official-player-qualification.mjs) uploads each exact local catalogue fixture through the player's file chooser in a fresh browser context. It checks the fixture's red/blue/green timeline marker in screenshots with the [maintained comparison oracle](../../../tests/head-to-head/checks.mjs). It measures decoded Web Audio buffers for the independent 440 Hz left / 880 Hz right marked signals. It then checks moving video, pause/resume, seeks to 6, 1, and 10 seconds with video/audio oracles after each, and near-EOF timeline settlement. The [final raw result](official-player-qualification/result.json) has fixture hashes, stage snapshots, screenshot hashes, and browser/script identity. The [earlier short screen](official-player-first-four.json) separately recorded five-second playback and one 60% seek.

| Demuxe catalogue row | Fixture SHA-256 prefix | Marked video/audio | Pause/resume | Seeks 6/1/10 s | EOF | Result |
| --- | --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | `37670a8e` | Pass | Pass | Pass | Pass | Screened |
| H.264 + AAC / MKV | `80360863` | Pass | Pass | Pass | Pass | Screened |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | `805810e7` | Pass, primary track | Pass | Pass | Pass | Screened, no alternate-track switch |
| H.264 + PCM24 / MKV | `eb2eef79` | Pass | Pass | Pass | Pass | Screened |

All four loads had no player warning, player error, or uncaught page error. The displayed marker and both marked audio channels passed at initial playback and after all three seeks. EOF settled at the fixture duration. FFprobe shows that the dual-audio fixture has default AAC stereo and nondefault AC-3 stereo. The example chooses its primary track and does not expose an alternate-track control; the selected codec was not directly observed through a player API, and AC-3 selection was **not** exercised.

The first two raw qualification attempts are retained as [attempt 1](official-player-qualification-first/result.json) and [attempt 2](official-player-qualification-second/result.json). Their MKV AAC audio checks reported wrong frequencies because the temporary zero-crossing probe included the near-silent AAC priming buffer. A buffer-level diagnostic measured the following audible buffers near 440/880 Hz, and the final runner excludes near-silent buffers from the tone estimate. FFmpeg decoding of the MKV fixture independently identified 440/880 Hz in its audible signal. These were harness failures, not player failures.

The README cells stay 🟡 Screened because the published example has no 1.25× playback-rate or alternate-audio-track control and does not expose cleanup state for the maintained comparison's lifecycle gate. The run did not test full acoustic speaker output, calibrated A/V sync, CPU, Firefox, or WebKit. It establishes bounded playback for the tested fixtures, not general codec/container support.

## Whole-browser CPU (MediaBunny player only)

The [CPU runner](../benchmark/official-player-cpu.mjs) measured the official player on the same four frozen fixture bytes, uploaded as browser `File` inputs. The final [MediaBunny-only raw campaign](official-player-cpu-mediabunny-only-20260925/result.json) used headed Chrome 153.0.8010.53, a fresh browser context per arm, a 960×540 viewport, a completed 150-second macOS startup task gate, five seconds of playback warmup, and three 20-second CPU windows per fixture. CPU is summed CDP Chrome-process CPU time divided by window wall time, expressed as percent of one core. It is **whole-player/browser CPU**, including the example's canvas and Web Audio work. Idle CPU was recorded neither as a subtraction nor a synthetic adjustment.

Every window required stable process IDs, visible/focused page, progressing timeline, 30 fps draw cadence, scheduled audio, no page/player errors, and no end-of-file during measurement. All 12 windows passed. Each source was the exact SHA-256 fixture listed above; the deployed player script hash matched the correctness screen.

| Fixture | Round 1 | Round 2 | Round 3 | Median CPU | Range |
| --- | ---: | ---: | ---: | ---: | ---: |
| H.264 + AAC / MP4 | 34.61% | 35.78% | 34.37% | **34.61%** | 34.37–35.78% |
| H.264 + AAC / MKV | 33.17% | 34.08% | 33.84% | **33.84%** | 33.17–34.08% |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV, primary track | 35.26% | 34.19% | 36.41% | **35.26%** | 34.19–36.41% |
| H.264 + PCM24 / MKV | 32.49% | 33.32% | 32.49% | **32.49%** | 32.49–33.32% |

These values belong to this MediaBunny-only campaign. They are **not** matched against the Demuxe, Native video, Movi, or AVPlayer CPU values in the README, which came from other campaigns. Earlier exploratory matched attempts are retained as [an older-runtime campaign](official-player-cpu-headed-20260925/result.json) and [a partial current-runtime campaign](official-player-cpu-current-20260925/result.json). The older frozen Demuxe runtime selected Hybrid for PCM24; the current compiled runtime selected Native Direct. Neither incomplete/mismatched attempt supplies the README's MediaBunny CPU cells. Pilot runs before the startup gate are also excluded. The selected codec on the dual-audio row was not directly observed, and no AC-3 switch was measured.
