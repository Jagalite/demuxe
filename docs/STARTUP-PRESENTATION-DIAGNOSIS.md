# Local Native startup diagnosis

Measured on 2026-09-27 against the local server at `http://127.0.0.1:4179`.
These are diagnostic samples from fresh browser contexts, with uncontrolled OS
and filesystem caches. They are not a controlled benchmark or evidence of a
regression relative to last night.

## Reproduced delay

Chrome 153.0.8010.53, local `startup-repro/no_audio.mkv` (H.264 + AC-3,
embedded subtitles), initially selected `native-direct-mpv`. Preparation
completed, but the browser reported no decoded audio. Output verification waited
its full 10-second deadline before selecting `native-transcode-mpv`.
The same deadline existed before the presentation redesign.

Time from `viewer.open(file)` to completion of `play()`:

| File | Page | Before | After |
| --- | --- | ---: | ---: |
| `no_audio.mkv` | presentation demo | 15.823 s | 3.460 s |
| `no_audio.mkv` | main player | 15.908 s | 2.714 s |
| `stuck.mkv` | presentation demo | 0.619 s | 0.164 s |
| `stuck.mkv` | main player | 0.430 s | 0.216 s |
| `full_subs_test.mkv` | presentation demo | 2.872 s | 0.529 s |
| `full_subs_test.mkv` | main player | 2.158 s | 0.521 s |

The causal change is the output trial deadline: 10 seconds becomes 1.5 seconds
for an initial, unverified, automatic local direct route with an admitted
alternative. Other phase variation is not attributed to this change. In
particular, the faster samples for the other files do not establish a speedup.
The main page autoplays during `open`; the presentation demo opens paused and
then receives an explicit `play`. These totals include both operations and do
not measure physical first-frame or audible-output latency.

## Fix and safeguards

- Yield from `direct` and `direct-mpv` trials to an already-admitted alternative.
- A short deadline is inconclusive, never cached as codec incompatibility.
- Preserve the original requested position when selecting the replacement.
- If replacement fails with a recoverable compatibility/asset error, restore
  the original position and give the retained route its normal verification
  window. Cancellation and permission errors are propagated.
- Manual Native, remote sources, previously verified playback, and
  `nativeRemux: 'never'` retain their normal output verification budget.
- Keep existing route admission and actual audio/video output checks intact.

## Validation and evidence

The after-run verified another two seconds of time advancement on both pages
for all three files. `no_audio.mkv` selected `native-transcode-mpv` with verified
output and decoded audio. `stuck.mkv` retained `native-direct`;
`full_subs_test.mkv` retained `native-direct-mpv`.

55 readiness, runtime capability, Native selection, and admission contract tests
passed. Additional cases cover short-deadline evidence, eligible trial scope,
fallback failure recovery, original position, and terminal errors.

Raw phase traces are local artifacts under:

- `results/startup-presentation/chrome-2026-09-27T17-39-38.437Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T17-40-21.829Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T17-47-36.683Z/result.json`

Run the diagnostic against the already-running server with:

```sh
FILES=/absolute/path/to/no_audio.mkv node tests/startup-presentation-diagnostic.mjs
```

`FILES` accepts comma-separated paths; `BROWSER=firefox` selects Firefox.

## Follow-up: comparison with yesterday's code

The shorter deadline addresses the reproduced `no_audio.mkv` stall; it does not
establish the cause of the user's reported change from yesterday. That earlier
claim of resolution was too broad.

An isolated temporary server served the generated player from `e1b8f36c`
(the autoplay commit after the ASS startup fix). Changed worker/inspector scripts
were restored to that revision; unchanged engine assets were shared. The
subtitle service Wasm and JavaScript hashes match yesterday's saved evidence.
The user's current server and checkout were not rolled back.

Both versions were tested on the main player page in Chrome 153.0.8010.53,
with preparation completed before opening, fresh contexts, autoplay enabled,
and two seconds of verified subsequent time advancement. Yesterday's recorded
Chrome version was also 153.0.8010.53. The current column includes the bounded
trial mitigation. These are one-sample diagnostic pairs, not statistically
controlled performance results; hashing/read order can affect I/O conditions.

| Local repro | Yesterday's code, run now | Current code, run now | Final route |
| --- | ---: | ---: | --- |
| `full_subs_test.mkv` | 1.594 s | 1.710 s | native-direct-mpv |
| `stuck.mkv` | 0.254 s | 0.353 s | native-direct |
| `software_test_slow.mkv` | 1.477 s | 1.080 s | native-direct-mpv |
| `no_audio.mkv` | 13.612 s | 4.585 s | native-transcode-mpv |

No general 10-second regression was reproduced. `no_audio.mkv` hits the same
10-second output deadline with yesterday's code. The fast files retained their
routes. For `full_subs_test.mkv`, subtitle initialization was 626/723 ms and
profile was 0.09/0.09 ms (yesterday/current), so the removed ASS scan did not
return. Yesterday's historical 0.615–1.442-second figures measured core `open`
without autoplay; these new figures include autoplay and completed `play`.
The user's original observed slowdown remains unexplained by these samples.

Additional raw evidence:

- `results/startup-presentation/chrome-2026-09-27T17-54-01.727Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T17-55-11.107Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T17-55-46.513Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T17-56-00.167Z/result.json`
- `results/startup-presentation/yesterday-comparison-manifest.json`

The diagnostic accepts `BASE_URL`, `PAGES=/`, and `PREPARED=1` for this setup.

## Firefox and installed Safari repro checks

2026-09-27, current working tree, main page at `localhost:4179`, same four local File inputs. Firefox 146.0.1 used Playwright; installed Safari 26.5.2 used safaridriver (not Playwright WebKit). Preparation completed before opening.

All eight cases passed startup and another two seconds of playback advancement. These are single diagnostic samples with uncontrolled I/O/cache state, not a browser performance ranking. Firefox measured open plus autoplay plus verified play; Safari measured open plus explicit user-activated play, excluding the automation gap between clicks.

| File | Firefox | Firefox route | Safari | Safari route |
| --- | ---: | --- | ---: | --- |
| `stuck.mkv` | 5.49 s | native-remux | 2.73 s | native-remux |
| `full_subs_test.mkv` | 6.99 s | native-remux-mpv | 3.38 s | native-remux-mpv |
| `software_test_slow.mkv` | 5.37 s | native-remux-mpv | 3.05 s | native-remux-mpv |
| `no_audio.mkv` | 7.23 s | native-transcode-mpv | 4.32 s | native-video-mpv-audio-subtitles |

Firefox evidence establishes browser audio presence with an advancing clock, not independently captured PCM. Safari evidence remains available in the raw backend capability records. These checks did not listen to speaker output or qualify long playback, seek, or subtitle fidelity.

Raw Firefox evidence: `results/startup-presentation/firefox-2026-09-27T17-58-53.139Z/result.json`.
Raw Safari evidence: `results/startup-presentation/safari-2026-09-27T18-00-42.218Z/result.json`.

Safari automation waits for custom-element registration and uses native local file-input uploads. Early harness setup failures are retained in separate result directories and excluded from these media results.

## Correction: installed-browser and old/current comparisons

The previous Firefox table used Playwright Firefox **146.0.1**, not the installed **156.0.1**. Installed Firefox was subsequently tested with geckodriver 0.37.1 in isolated headless profiles. The same WebDriver harness, file-input upload, completed preparation, and explicit Play sequence were used for old/current comparisons within each browser. Safari remained installed 26.5.2.

The baseline is yesterday's committed JavaScript (`e1b8f36c`) using shared current engine assets, not a frozen copy of yesterday's entire machine. No native source changes occurred between that commit and HEAD; only the subtitle engine hashes have also been matched against the historical campaign.

| File | Firefox 156 old/current | Safari 26 old/current |
| --- | ---: | ---: |
| `stuck.mkv` | 2.45 / 2.44 s | 2.31 / 2.20 s |
| `full_subs_test.mkv` | 3.10 / 2.58 s | 3.03 / 2.42 s |
| `software_test_slow.mkv` | 4.18 / 2.15 s | 2.58 / 2.24 s |
| `no_audio.mkv` | 3.39 / 5.59 s | 2.59 / 2.21 s |

All rows retained the same route within each browser and passed continued playback. These individual samples do not establish a statistically significant difference or a cause. The slow initial table should not be used as evidence that today's code regressed from yesterday.

`no_audio.mkv` was repeated in reversed order: current 2.47 s, old 1.56 s. A further phase-instrumented old/current pair measured **3.82 / 3.70 s**. In that pair:

- Direct media loading: old 1.524 s, current 1.385 s.
- First subtitle-service preparation: old 0.925 s, current 0.837 s.
- Missing selected audio then rejected the direct route; fallback subtitle preparation was 0.412 / 0.393 s.
- Final output verification: 0.194 / 0.231 s.

The measured cost is route preparation followed by rejection and fallback, present in both versions. The broader user-reported regression remains unisolated. No additional production change was made on the basis of these noisy results.

Initial installed-Firefox WebDriver traces were empty because Firefox wraps CustomEvent.detail across script realms. The diagnostic now installs observers in the page realm; repeat/phase runs have complete traces. Initial timing and advancement checks were independent of those event observers.

Raw evidence:
- `results/startup-presentation/firefox-2026-09-27T18-03-21.478Z/result.json`
- `results/startup-presentation/firefox-2026-09-27T18-04-05.044Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-04-44.752Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-05-09.218Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-05-46.033Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-06-15.975Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-07-48.920Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-07-58.375Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-08-54.450Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-09-04.544Z/result.json`
