<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Pages playback validation — 2026-09-28

The updated Pages page passed nine Chrome and nine Firefox trials: three per
Native, Hybrid and Software mode. Checks cover service-worker isolation,
changing pictures, non-silent audio, pause/seek, HTTP ranges, returning visits,
source-relative asset requests, and controls remaining inside desktop, phone
and short landscape viewports. Playground transport remains visible with its
settings panel open. Representative rendered output screenshots were inspected.

This used the frozen **local preview** at `build/pages-preview-20260928-fit`,
served over loopback at `/demuxe/`, without server-provided isolation headers.
The snapshot contains current compiled application code and existing local Wasm
assets. The local engine build record is stale; this is **not** a clean tagged
engine build, a deployed CDN benchmark, or npm release qualification. No public
deployment or new release tag was created in this task. The clean Ubuntu engine
build and deploy jobs remain unexecuted until a tag contains these changes.

Host: MacBookAir10,1, 8 logical CPUs, macOS 26.5.2. Browsers ran headlessly and
sequentially. Each trial used a fresh context in a shared browser process, not a
cold OS/compiler cache. Other activity on this shared machine was not controlled.

Fixture: `fixtures/example.mp4`, H.264/AAC, 640×360, approximately 12 seconds,
1,372,304 bytes. SHA-256:
`6c9cac6f4212f470d79a9f829f29ba459e6c3e401fab9feb6d757a10a507404c`.

## Timings

All values are milliseconds: **median (minimum–maximum)** of three trials.
Video/audio timings start at “Try an example”; they include the sample fetch,
File construction and opening. Video is the first observed native frame callback
from the mounted media surface or Wasm renderer counter, not a physical display
latency measurement. Audio is first RMS above 0.005 at the instrumented output.
Seek is operation completion; a separate screenshot verifies the changed picture.
Page-ready includes the first-visit isolation reload. Details are in [the test
method](PAGES.md#playback-and-timing-evidence).

| Browser | Mode | Page ready | First video observation | First non-silent audio | Seek to 2 s |
| --- | --- | ---: | ---: | ---: | ---: |
| Chrome | native | 157 (155–169) | 41 (41–259) | 52 (47–267) | 9 (6–15) |
| Chrome | hybrid | 161 (158–164) | 528 (528–546) | 528 (528–546) | 266 (239–268) |
| Chrome | software | 163 (157–244) | 471 (375–472) | 478 (375–480) | 279 (276–362) |
| Firefox | native | 312 (245–530) | 86 (71–297) | 119 (74–313) | 11 (11–41) |
| Firefox | hybrid | 257 (251–663) | 1218 (1172–1224) | 1244 (1207–1262) | 273 (270–275) |
| Firefox | software | 250 (244–251) | 1043 (970–1220) | 1066 (998–1244) | 438 (436–496) |

## Evidence and limits

- [Chrome 153.0.8010.53 raw result](../results/pages/chrome-2026-09-28T20-53-01.382Z/result.json); [frozen test harness](../results/pages/chrome-2026-09-28T20-53-01.382Z/harness.mjs).
- [Firefox 146.0.1 raw result](../results/pages/firefox-2026-09-28T20-54-28.941Z/result.json); [frozen test harness](../results/pages/firefox-2026-09-28T20-54-28.941Z/harness.mjs).

The result files retain fixture/runtime/harness hashes, routes, all individual
measurements and screenshots. Native selected `native-direct`; forced Hybrid
and Software selected their corresponding routes. Non-silent audio and changing
pictures establish this bounded sample's output, not audio fidelity, A/V sync,
physical-device behavior or broad codec coverage.

One earlier Firefox run ended with “Target page, context or browser has been
closed” during the returning-visit reload after Hybrid playback. Its
[failed result](../results/pages/firefox-2026-09-28T20-53-44.041Z/result.json)
is retained. The unchanged harness passed all nine trials on retry. The cause
of that interrupted browser run is unresolved; the workflow does not automatically
retry or ignore failed playback checks.

`npm run build` passed, including TypeScript and license checks. Three Pages
assembler tests and Actionlint 1.7.7 passed. Assembler tests use a synthetic
runtime archive and do not test native compilation. Earlier timing runs before
the viewport correction are retained but superseded by the two runs linked above.

Repository Pages configuration was verified as `build_type: workflow`. The
`github-pages` environment allows ordinary and slash-separated tags through `*`
and `**/*` tag policies; existing branch policies were preserved. The previously
deployed public page remains available until the first successful tagged build.
