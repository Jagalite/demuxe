# mpv subtitle-service prototype and performance

**Decision: pursue the subtitle-only adapter; do not enable a production route yet.**

The private Wasm prototype drives mpv's existing subtitle reader and renderer with explicit timestamps, using core locking and the existing bounded subtitle-tile export. It creates zero mpv audio/video chains. A browser NativePlayer handles incremental remux, A/V decode and playback. Subtitle updates reuse mpv change IDs so unchanged overlays are not transferred each video tick.

## Measured result

Headed Chrome 152.0.7977.83, three fresh-browser runs per arm, alternating S/C, C/S, S/C. Same authored 40-second 1280x720 24fps HEVC Main10/AAC/ASS file, no B frames, one-second GOPs. Two-second warmup then twelve-second measurement windows. All six windows maintained real time and delivered 285–291 frames; no process turnover or runtime playback errors. CPU is summed browser-process CPU time from CDP SystemInfo, one core = 100%.

| Metric | Full Software | Incremental remux + mpv subtitles |
| --- | ---: | ---: |
| Median CPU | 70.0% of one core | 50.1% of one core |
| CPU range | 69.7–70.1% | 48.6–52.7% |
| Media progression / 12 s | 12.04 s | 12.02–12.03 s |
| Median open wall time | 626 ms | 595 ms |

**Median CPU reduction: 28.4%.** This exceeds the predeclared 20% narrow steady-state target. Three short trials do not provide population confidence or physical power/energy evidence. Startup numbers are warm local assets in fresh browser processes, exclude browser launch/page import, and do not establish a meaningful startup advantage.

The candidate performs actual on-the-fly remuxing. It does not consume a prepared MP4. It nevertheless stages the entire approximately 8 MiB source for the separate subtitle demuxer and enforces a 16 MiB prototype limit. The service and remuxer each expose 64 MiB Wasm heaps; browser decoder, process memory and source copies are additional. No total-memory saving is claimed.

## Correctness evidence

`../2026-09-21T18-41-52.402Z/subtitle-comparison.json`: at source times 2, 5 and 13 seconds, subtitle support masks match the normal Software mpv renderer exactly (IoU 1.0); RGB error over caption bands is 0–0.006/255. The fixture exercises a long cue spanning seeks, overlapping/animated ASS and an attached font. Seek sequence 2 → 5 → 13 → 2 → 39 includes rewind and a no-cue negative control. The no-cue output is empty in both arms. These are component subtitle seeks under explicit time injection, not qualified combined native-video seeks. Fade boundary accuracy, font fallback differences, bitmap subtitles, source replacement, track switching and endurance are not established.

Both correctness arms cleaned up all workers. Some performance snapshots still saw one candidate worker at 200 ms after close; the fresh browser was subsequently closed each time. A bounded teardown follow-up `../2026-09-21T18-44-59.765Z/` and resource follow-up `../2026-09-21T18-45-52.542Z/` observed zero remaining workers. The two console 404s were missing favicon.ico requests, not failed playback assets. Raw observations and the initially over-strict draft summary are retained; `assessment.json` is the final scoped interpretation.

## Preserved failures and limits

- `../2026-09-21T18-31-13.093Z/`: harness started before synthetic fixture generation completed; setup failure, excluded.
- `../2026-09-21T18-31-30.844Z/`: B-frame synthetic file rejected by existing remux timeline guard.
- `../2026-09-21T18-32-14.665Z/`: harness assumed unsupported VideoPlaybackQuality.toJSON; corrected without production changes.
- `../2026-09-21T18-32-28.613Z/` and `../2026-09-21T18-33-20.413Z/`: combined native seeks timed out or failed target-presentation verification.
- `../2026-09-21T18-34-06.570Z/`: initial baseline did not select its subtitle track; corrected to explicitly select sid=1 before comparison.
- `../2026-09-21T18-36-32.149Z/`: no-B-frame long-GOP candidate lost buffered ranges and stalled; all CPU comparisons from that run are invalid.
- `../2026-09-21T18-39-57.533Z/`: valid one-second-GOP initial implementation transferred unchanged overlays, with about 16% lower median CPU. Final change-ID reuse improves the bounded result to 28%.

No production routing or existing source media was modified. This is not qualification of the original 16-minute MKV, Firefox, arbitrary HEVC, long GOPs, B frames, remote sources, or large files. Prior Firefox Main10 corruption remains independent and unresolved. Missing remux correctness must not be hidden by a successful subtitle service.

## Next implementation step

Retain this internal adapter approach rather than reimplement mpv subtitle behavior. Before promotion: fix/qualify the remux failures; use bounded range transport instead of complete subtitle-source staging; expose real source/seek epochs and video geometry; qualify track changes, delays, attached fonts, bitmap formats and source replacement. Measure those integrated costs before changing automatic admission. The private bridge currently depends on the available v0.40.0 mpv build tree and is not a stable public libmpv API.

## Reproduction

See `experiments/mpv-subtitle-service/README.md`, raw results, source snapshot and manifest. Pinned build cache is `/Volumes/seed2/Projects/webmpv/build`; source archive was verified in the preceding analysis. Test fixture is authored synthetic content with the repository's existing DejaVu font. Browser tests are headed; run performance sequentially without concurrent builds/tests.
