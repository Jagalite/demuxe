# Bounded local-reader optimization

2026-09-27. This pass changes only local byte delivery in `web/file-reader.js`; route admission, startup deadlines, subtitle verification, and playback output checks are unchanged from the preceding working tree.

## Review disposition

The stream reader remains the production default. Review found that the mixed single-sample timings below do not justify enabling FileReader globally. The candidate is retained only behind the internal `LocalFileReader` constructor option `{experimentalFileReader: true}` for explicit comparison tests; no player option or worker message enables it. All existing playback call sites use streams.

The measurements below describe the earlier, globally enabled candidate, not the revised default. The extra temporary buffer belongs only to the opt-in candidate. A regression test installs an available FileReader that throws if constructed and verifies that default local reads still use streams.

## Candidate change and limits

When explicitly enabled, use cancellable `FileReader.readAsArrayBuffer` for a validated local Blob slice, delivered through the existing reader loop. Retain the stream implementation when FileReader is unavailable or a source supplies a non-Blob stream adapter.

- Each read is still at most 256 KiB; validate returned Blob size before starting FileReader.
- Keep the existing 4 MiB maximum cache and configurable request budget. No lifetime request cap is added.
- Epoch changes and close abort the active FileReader; stale bytes cannot enter the cache.
- Read failures propagate. The adapter does not silently retry an unreadable source through another API.
- Transient accounted buffers can reach 512 KiB (one 256 KiB result plus the existing output copy), compared with 320 KiB observed for 64 KiB stream chunks. Cache size is unchanged. This bounded memory tradeoff is explicit.

## Correctness and regression checks

33 focused local-reader, subtitle-deadline, and remote-range tests passed. The remote-range tests initially lacked their fixture server; after starting that server, the complete selected suite passed. New reader contracts cover exact bytes, size bounds, EOF, cache reuse, FileReader errors, concurrent-read rejection, and epoch/close cancellation. The existing 8,193-read lifetime regression still passes.

Frozen baseline/candidate JavaScript copies differed only in the reader. Engine assets were shared and their hashes recorded. Unrelated checkout work was preserved. Installed Firefox 156.0.1, installed Safari 26.5.2, and Chrome 153.0.8010.53 each ran all four local repro files on the main page. Both arms passed playback advancement, paused forward/backward seeks, resume, 1.25x rate, identical selected routes, and matching subtitle text at the sampled seek positions. These are bounded regression checks, not exhaustive subtitle visual or long-playback qualification.

Firefox and Safari also compared exact reader output against independent Blob reads at four offsets (including EOF), then tested real-browser cancellation and reuse. Chrome repeated that check on the subtitle-heavy file.

## Startup measurements

Seconds; single samples. Filesystem/browser state was not reset, so these are diagnostics, not claims of a universal speedup. First Firefox/Safari pairs included the byte/cancellation probe before startup; the reversed Firefox pair and Chrome startup pairs did not. Safari used explicit Play activation; Chrome included autoplay. Compare arms within a browser, not browser rankings.

| File | Firefox stream / FileReader | Safari stream / FileReader | Chrome stream / FileReader |
| --- | ---: | ---: | ---: |
| `stuck.mkv` | 2.06 / 2.14 | 3.00 / 2.24 | 0.64 / 0.42 |
| `full_subs_test.mkv` | 3.91 / 2.55 | 2.40 / 2.53 | 1.46 / 1.26 |
| `software_test_slow.mkv` | 2.79 / 2.67 | 2.68 / 2.48 | 0.54 / 0.47 |
| `no_audio.mkv` | 5.05 / 19.72 | 2.06 / 4.08 | 2.77 / 3.26 |

Reversed-order Firefox pair (FileReader first, stream second):

- `full_subs_test.mkv`: FileReader 2.76 s; stream 3.03 s. Both ordered pairs favored FileReader for this file (first pair 2.55 vs 3.91 s).
- `software_test_slow.mkv`: FileReader 2.57 s; stream 2.53 s. No meaningful advantage established.

The 19.72-second Firefox `no_audio.mkv` outlier is retained. Of that total, 17.90 seconds was in the browser's initial direct `loadeddata` wait, before subtitle playback transport was initialized. It is not evidence that this optimization resolves Native-load stalls, nor is it excluded from the table. Safari and Chrome also had cases with slower candidate totals. No general startup speedup is claimed.

## Read-only worker microchecks

Each arm read 64 slices of 256 KiB (16 MiB total), with identical checksums for the same offset sequence, and no application-level reader cache. First sequences used stream/FileReader/FileReader/stream; a second Firefox sequence reversed that order and used the next offset region. All warm repetitions were similar, and the first arm was often much slower regardless of API. These results do not isolate physical disk latency or justify claiming an order-of-magnitude API speedup.

| Browser/sequence | Arm order | Total elapsed ms |
| --- | --- | --- |
| micro-firefox | stream / file-reader / file-reader / stream | 7581 / 260 / 20 / 17 |
| micro-safari | stream / file-reader / file-reader / stream | 97 / 46 / 26 / 23 |
| micro-firefox-reverse | file-reader / stream / stream / file-reader | 712 / 18 / 22 / 19 |
| micro-chrome | file-reader / stream / stream / file-reader | 106 / 25 / 173 / 22 |

## Remaining work

The explicit 1.5-second direct-route trial, serial subtitle verification, intermittent source-read delays, and full-budget failure retry still exist. This is an unqualified transport experiment with correctness coverage; it does not resolve or identify the entire day-to-day regression. Larger route or scheduling changes should be evaluated separately.

## Evidence

Reader sources, hashes, frozen generated-module hashes, shared engine hashes, and the last microcheck worker source are saved in `results/startup-presentation/reader-optimization-manifest.json`. Those frozen sources predate the review change restoring the stream default. The subsequent default-selection fix is covered by focused reader and subtitle scheduling tests; the browser campaign has not been rerun for that fix. The diagnostic harness has optional `READER_CHECK=1` and `LIFECYCLE=1`. `READER_BENCH=1` expects the isolated comparison worker and baseline-reader alias used by this campaign, not the normal production server.

- `results/startup-presentation/firefox-system-2026-09-27T18-30-18.609Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-31-01.044Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-32-44.153Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-32-06.631Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T18-33-59.596Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T18-34-47.545Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-35-34.695Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-35-54.307Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-36-30.709Z/result.json`
- `results/startup-presentation/safari-2026-09-27T18-36-48.286Z/result.json`
- `results/startup-presentation/firefox-system-2026-09-27T18-38-27.534Z/result.json`
- `results/startup-presentation/chrome-2026-09-27T18-38-39.121Z/result.json`
