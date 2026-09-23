# Browser capability startup comparison

Compared `80b5202b99fe7d20db3abcb128d855ae5507a0f0` (before) with `6f0cb44` (after) on 2026-09-22 local time / 2026-09-23 UTC.

## Results

Median milliseconds, seven measured runs per revision/browser/file. One additional warmup per cell is excluded. An open failure is retained as a failure, never counted as zero milliseconds.

| Browser | Media | Before first content | After first content | Change | Open ready before → after |
|---|---|---:|---:|---:|---:|
| chrome | H264-AAC-MP4 | 38 | 29 | -9 ms | 25 → 25 |
| chrome | H264-AAC-MKV | 79 | 77 | -2 ms | 65 → 62 |
| chrome | user-AC3-MKV | 548 | 582 | +34 ms | 394 → 349 |
| firefox | H264-AAC-MP4 | 44 | 43 | -2 ms | 35 → 39 |
| firefox | H264-AAC-MKV | 165 | 170 | +5 ms | 153 → 157 |
| firefox | user-AC3-MKV | 2467 | 1272 | -1195 ms | 2226 → 1042 |
| webkit | H264-AAC-MP4 | 1236 | 1243 | +6 ms | 204 → 209 |
| webkit | H264-AAC-MKV | 479 | 459 | -20 ms | 178 → 154 |
| webkit | user-AC3-MKV | — | 622 | — | — → 412 |

## Interpretation

- Firefox on the user AC3 file improved from 2,467 ms to 1,272 ms (48.5% lower). Both accepted routes were Hybrid; the new selection avoids rejected Native attempts.
- Chrome on the user file increased from 548 ms to 582 ms (+34 ms / 6.2%). The baseline first frame belongs to `native-direct-mpv`; the new first frame belongs to Hybrid. The older route can display silent video before later fallback. This is not a comparison of time to working audio/video. Startup readiness improved from 394 ms to 349 ms.
- WebKit failed all seven measured baseline opens of the user file with FFmpeg error -28. The new revision passed all seven opens, median first content 622 ms. No finite latency delta can be calculated.
- Ordinary H264/AAC MP4 and MKV median differences ranged from -20 ms to +6 ms, with no consistent slowdown. These small samples do not establish statistical equivalence. WebKit MKV had a 1,462 ms new-revision outlier; raw ranges are retained in summary.json.

## Method and limits

- Chrome 153.0.8010.53, Playwright Firefox 146.0.1, and Playwright WebKit 26.0, headless on the same machine. These are not a qualification of the separately installed desktop Firefox/Safari versions.
- Time zero is immediately before `player.open(File)`. The page, Player module, and file input are already loaded. App/module boot time and file chooser transfer are excluded.
- First content is the first nonuniform video image observed via 32×18 canvas sampling in requestAnimationFrame on a visible player surface. This is a first-visible-content proxy, not physical display timing or the first decoded black frame. It includes a visible paused-open frame.
- `play()` is requested immediately after `open()` resolves, but the benchmark does not await later audio/output verification. A Firefox pilot showed a first frame followed by a Native output verification timeout in both revisions; those pilots are excluded. Continued playback/audio correctness is covered by the separate browser-capability evaluation, not this timing experiment.
- A fresh browser context is used per run, with one browser running at a time and before/after order alternating. HTTP cache is disabled equally by routing. Server files and OS caches are warm after an excluded run per cell. This is not a cold disk/network benchmark.
- The exact changed browser JavaScript assets are served from each git revision; unchanged runtime binaries are shared. The working checkout is never swapped.
- Fixtures: `build/fixtures/software-full/h264-aac.mp4` (4 seconds, 320×180 H264/AAC), a packet-copy MKV made from that fixture, and `/Volumes/seed2/Projects/startup-repro/no_audio.mkv` (the user reproduction). Each comparison uses identical file bytes for both revisions.
- All 126 measured attempts are preserved, including seven baseline WebKit failures, plus 18 excluded warmups. Initial harness-development runs are kept locally but are not included in this report.

## Reproduce

```sh
BEFORE=80b5202 AFTER=6f0cb44 REPETITIONS=7 node tests/browser-capability-startup.mjs
```

The command returns nonzero when the baseline fails (as WebKit did here), while retaining its JSON evidence. `BROWSERS=chrome` or `BROWSERS=firefox,webkit` can restrict the run.

See [raw runs](result.json) and [summary with ranges](summary.json).
