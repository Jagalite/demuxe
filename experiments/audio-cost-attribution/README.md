# Selective audio cost attribution

Scoped experiment for the frozen HEVC Main10 SDR + stereo 48 kHz AC-3 fixture.
Overrides are served by a private HTTP proxy. Production files are not edited.

`run.mjs` runs correctness checks (`CHECK_ONLY=1`) or unprofiled, ten-second
whole-Chrome CPU windows with the maintained startup gate. `CORRECTNESS` is a
comma-separated list of results with matching fixture/runtime hashes and a
passing case for each arm. `OUT` must be a fresh directory. `LANES` selects the
order. `TRACE_ONLY=1` collects only a separate instrumented baseline profile.

Arms:

- `baseline`: original audio path, plus the same one-time worklet acknowledgement
  used by the two audio interventions.
- `no-scan`: skips only the worklet's rate-boundary metadata scan, after normal
  setup and a seek. Valid only for this constant-rate experiment. Metadata
  production/copying, PCM copying and timeline messages remain.
- `quantum512`: asks the selective AudioContext for 512-frame render quanta;
  actual `renderQuantumSize` must equal 512. The latency hint remains interactive.
- `video-only`: destroys the entire mpv audio service while retaining the original
  native video element and remux playback. This measures a whole-path removal,
  not pure decoder or worklet cost.

The profile adds timestamp markers around PCM pumping and mpv event dispatch.
`analyze.py OUT` uses thread CPU clocks (`tts`/`tdur`), unions nested intervals,
and compares coverage with the renderer's process CPU budget. Wall-time waits
and nested inclusive durations are never added as CPU costs. Trace output and
unprofiled CPU output are distinct observations and must not be added together.

`thread-counters.py` reads macOS per-thread CPU counters at the profile boundaries
to catch CPU on threads with sparse trace events. Its nanosecond times do not
use the Mach timebase conversion applied to process rusage counters. Thread
turnover and lookup failures remain explicit. Worker timestamp acknowledgements
map trace IDs to script URLs; unavailable mappings remain unidentified.

This is not production qualification for rate changes, seeks, EOF, multichannel
audio or other codecs. Retain failed cases and document exclusions; do not rerun
an entire table to fill a missing profile.
