# Startup cost breakdown — 2026-09-27

Measured on the four local repro files using installed Firefox 156.0.1 and Safari 26.5.2. Preparation completed first; actual file-input uploads and explicit Play clicks were used. Timings exclude the WebDriver gap between Open and Play. These are phase diagnostics with uncontrolled read/scheduling conditions, not controlled performance benchmarks.

## Main findings

1. Most tested MKVs first spend **1.5 seconds** in a direct `loadeddata` trial before remux starts. This is an explicit policy deadline, not remux CPU work.
2. Native preparation is serial: direct/remux media preparation, then subtitle services, then output verification. Subtitle initialization and verification block readiness.
3. Subtitle verification renders bounded sample times and restores the current position. It is separate from the removed full-track ASS profile scan. In the first Firefox campaign it cost **1.147 seconds** for `full_subs_test.mkv` and **0.968 seconds** for `software_test_slow.mkv`; corresponding Safari checks were **0.111 / 0.099 seconds**.
4. `no_audio.mkv` can prepare subtitles for the direct route before missing audio rejects that route, then initialize subtitles again for the fallback. The first Firefox campaign spent 0.656 + 0.509 seconds in these two service preparations.
5. Intermittent source-read latency can dominate the subtitle service. A measured slow run then escalated into a 25-second original-route retry; details below.

## Complete top-level accounting

Milliseconds, rounded. Subtitle services includes subtitle verification (do not add its nested timings again). Remux preparation includes worker startup, transport setup, FFmpeg opening, MSE buffering, and any browser seek wait. Other is the measured remainder: inspection, selection, dynamic imports, cleanup, and UI/call overhead. It is not a measurement of UI rendering alone.

| Browser / file | Direct load trial | Remux preparation | Services | Output verification | Other | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Firefox / `stuck.mkv` | 1501 | 750 | 0 | 250 | 105 | 2607 |
| Firefox / `full_subs_test.mkv` | 1507 | 712 | 2009 | 110 | 160 | 4499 |
| Firefox / `software_test_slow.mkv` | 1502 | 537 | 1317 | 106 | 90 | 3553 |
| Firefox / `no_audio.mkv` | 1379 | 869 | 1165 | 118 | 754 | 4284 |
| Safari / `stuck.mkv` | 1501 | 496 | 0 | 79 | 96 | 2172 |
| Safari / `full_subs_test.mkv` | 1500 | 221 | 490 | 357 | 29 | 2597 |
| Safari / `software_test_slow.mkv` | 1501 | 252 | 420 | 341 | 30 | 2544 |
| Safari / `no_audio.mkv` | 718 | 73 | 1168 | 61 | 95 | 2115 |

All eight cases in that first campaign continued playing. Safari's `no_audio.mkv` route was native video plus mpv audio and subtitles, so its Services column also includes audio-engine initialization.

## Inside worker initialization

Firefox `full_subs_test.mkv`, first campaign:

- Subtitle engine factory: 403 ms. This includes factory initialization; it is not isolated Wasm compilation CPU time.
- Font/service setup: 6 ms.
- Subtitle I/O worker ready: 50 ms.
- Subtitle source open/metadata: 264 ms.
- Total subtitle init RPC: 802 ms; the remainder includes worker/module startup and message delivery.
- Subtitle output verification: 1,147 ms, including sample rendering and restoring the initial position.
- Profile query: negligible; the old whole-track profile scan has not returned.

Initial remux `_rm_open` spans (which include synchronous I/O waits) were 30–140 ms in the first Firefox campaign. A later `full_subs_test.mkv` run reached 1,336 ms in this same span. It is therefore incorrect to attribute all remux elapsed time to codec processing or compilation.

## Slow-read failure and retry amplification

The file-read instrumented Firefox run on `full_subs_test.mkv` failed after **36.167 seconds**:

- Remux source: 47 requests, 6,901,373 bytes, 301 ms cumulative `LocalFileReader.read` elapsed time, maximum call 88 ms.
- Subtitle source: 160 requests, 16,491,192 bytes, **6,495 ms** cumulative `LocalFileReader.read` elapsed time, maximum call 262 ms.
- Subtitle init RPC: 3,214 ms; subtitle output verification: 4,983 ms. These intervals overlap the read totals and must not be added to them.
- The subtitle renderer reported `Subtitle packet deadline exceeded`.
- Selection then retried the original direct route with the full deadline; `loadeddata` waited another **25,010 ms** before failing.

These read measurements include browser stream delivery, copying, cancellation, and scheduling inside the bounded reader. They do not establish physical disk latency or a caching explanation. The failure occurred with test-only worker instrumentation; a subsequent run against the normal worker code succeeded in **4.748 seconds**, including 1.503 s direct trial, 0.676 s remux preparation, 2.100 s subtitle services (1.032 s verification), and 0.271 s final output verification. The intermittent 36-second failure is preserved as diagnostic evidence, not claimed as a consistently reproduced shipping failure.

A separate deeply instrumented run failed with the same subtitle packet deadline, followed by the same direct full-budget retry, after 37.007 seconds. Another run spent 6.359 seconds on `stuck.mkv`; part of that elapsed interval after playable remux coverage was not directly instrumented. Later explicit `seeked` measurements were 15–59 ms, so the earlier long residual is not confidently attributed to seeking.

## Optimization targets supported by these traces

- Avoid a doomed direct attempt when actual retained browser/source evidence permits it; unknown capability must remain unknown.
- Reject a provably missing selected audio track before paying subtitle initialization for that route.
- Reduce startup subtitle sample/restore work and its sequential source reads while preserving subtitle-output correctness.
- Review the full-budget direct retry after a failed remux/subtitle path; it can amplify a several-second problem into a 36–37-second failure.
- Share already-prepared engine assets where possible. `prepare="all"` currently prepares inspector, Hybrid, Software, and the font; it does not prepare the subtitle service or audio-adaptation engine. The remux playback init message also does not supply the inspector's prepared Wasm module. Factory elapsed time includes more than compilation, so savings must be measured.

No production fix was made during this diagnosis. These findings locate costs and a failure-amplification path; they do not isolate the cause of the reported day-to-day regression.

## Code and reproduction

- `src/unified-player.ts`: `discover` local direct-load budget and full-budget retry.
- `src/internal/native-player.ts`: `open`, `startRemux`, `openServices`, `verifyStartup`.
- `src/internal/native-mpv-subtitles.ts`: `verify` sample loop and restore.
- `web/mpv-subtitle-worker.js`: `seekDisplay`, `init`, render readiness loop.
- `web/file-reader.js`: bounded local stream reads.
- `src/internal/engine-preparation.ts`: prepared components/modules.

`tests/startup-cost-overlay.py` creates an isolated temporary runtime with worker timing probes, leaving production files untouched. `tests/startup-safari-diagnostic.mjs` supports installed Safari and `BROWSER=firefox-system DRIVER=/path/to/geckodriver`, plus `BASE_URL` and `FILES`. The temporary overlay served on port 4188; the normal player remained on 4179.

Raw evidence:
- `results/startup-presentation/firefox-system-2026-09-27T18-13-04.432Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-13-38.947Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-15-53.829Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-16-51.632Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-17-20.760Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-18-48.513Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-20-02.919Z/result.json`
