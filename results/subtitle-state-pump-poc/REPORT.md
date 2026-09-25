# Subtitle state-pump PoC

**CHEAP STATE PUMP LOOKS VIABLE.** At 10 Hz, pure `update_subtitles` calls took 1.9 ms total over 9.7 s for SRT and 2.1 ms over 11.7 s for static ASS. The old 60 Hz full-render calls took 126.8 ms and 39.9 ms respectively in those matched-format windows. Per native call, the state update was about 16× cheaper for each fixture (SRT 0.014 vs 0.222 ms; ASS 0.0035 vs 0.058 ms). Including deadline renders, native time at 10 Hz was 18.5 ms for SRT and 14.4 ms for ASS. These are worker wall times around native calls, not CPU-cycle measurements.

One real-time headless-Chrome run per cell, isolated subtitle worker, 1× synthetic browser PTS, 640×360 overlay, no production edits. `update_subtitles` was the only periodic native call in pump cells. The existing decode/timing callback supplied epochs; the worker queried raw boundaries when the epoch changed and rendered at each discovered boundary. The reference used the current worker's full render RPC at 60 Hz; its calls also run `update_subtitles` internally, so zero in the Updates/s column means zero *separate* pump calls. Late means visible render response more than 100 ms after cue start.

| Format | Mode | Updates/s | Full renders/s | Native update ms | Native render ms | Active renderer CPU s* | Earliest cue lead | Latest visible response | Late/missed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SRT | old 60 Hz | 0 | 58.9 | 0 | 126.8 | 0.77 | — | 20.6 ms | 0/3 |
| SRT | 60 Hz pump | 59.0 | 0.62 | 8.0 | 26.2 | 0.44 | 0.99 s | 61.6 ms | 0/3 |
| SRT | 30 Hz pump | 29.6 | 0.62 | 5.4 | 23.6 | 0.33 | 0.99 s | 56.0 ms | 0/3 |
| SRT | 15 Hz pump | 14.9 | 0.62 | 3.1 | 24.9 | 0.27 | 0.99 s | 66.3 ms | 0/3 |
| SRT | 10 Hz pump | 9.9 | 0.62 | 1.9 | 16.7 | 0.19 | 0.99 s | 49.2 ms | 0/3 |
| SRT | 5 Hz pump | 5.1 | 0.62 | 1.5 | 23.9 | 0.16 | 0.99 s | 65.7 ms | 0/3 |
| ASS | old 60 Hz | 0 | 59.1 | 0 | 39.9 | 0.35 | — | 11.6 ms | 0/2 |
| ASS | 60 Hz pump | 59.5 | 0.34 | 2.5 | 13.0 | 0.22 | 2.96 s | 48.4 ms | 0/2 |
| ASS | 30 Hz pump | 29.6 | 0.34 | 5.3 | 13.0 | 0.35 | 2.99 s | 48.1 ms | 0/2 |
| ASS | 15 Hz pump | 14.9 | 0.34 | 4.3 | 24.3 | 0.35 | 2.99 s | 65.6 ms | 0/2 |
| ASS | 10 Hz pump | 9.9 | 0.34 | 2.1 | 12.3 | 0.19 | 2.99 s | 54.2 ms | 0/2 |
| ASS | 5 Hz pump | 5.1 | 0.34 | 2.0 | 25.1 | 0.24 | 2.99 s | 60.1 ms | 0/2 |

*CDP `SystemInfo.getProcessInfo` for the busiest renderer process. It contains the worker and page and varied across runs; whole-Chrome CPU had larger unrelated browser-process swings. The native call timings and call counts support the cost comparison more directly than these CPU samples.

The SRT fixture has starts at 1, 3, and 8 s; static ASS has starts at 3 and 4 s. All were known after the first pump, so this run cannot identify a minimum cadence for truly late packet delivery. A second 1.5 s run started at media PTS 199.5 against a 200 s cue in an interleaved SRT file and an ASS conversion of that file. All five cadences knew the event about 500 ms early, rendered once at the deadline, and returned visible pixels within 15–34 ms, with no late or missed cues. The callback did not emit a new decode notification in that second run because the seek had already exposed the event before callback registration; the initial timing query found it.

For these fixtures, **10–20 Hz is sufficient**, and 5 Hz also passed. Static ASS did not require a higher cadence than SRT. This does not qualify 5 Hz for streaming, delayed packets, or animated ASS; those cases can present events after the previous pump, giving a worst-case discovery wait near one pump interval. Deadline renders cost more when performed cold at the cue than repeated 60 Hz renders, but stayed below the 100 ms gate here.

Raw runs: `raw.json.zst` and `raw-late.json.zst`. Reproduce with `python3 experiments/subtitle-state-pump-poc/build.py`, then `node experiments/subtitle-state-pump-poc/run.mjs` and `SCENARIO=late node experiments/subtitle-state-pump-poc/run.mjs`. The isolated service snapshot SHA-256 is `be85f965bee724a4be64f2767248eef922af2a56259e74f56a66d58039c6797e`; linked `libmpv.a` SHA-256 is `0b4f34d8a8159642cb1e02c979dac898fbb2352268496f2ca1a648bf9e4e2e9b`. Generated engine files can be rebuilt and are not needed for the evidence.
