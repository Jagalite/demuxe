# mpv subtitle-service laboratory

Prototype: the browser performs incremental remux and A/V playback; a separate
Wasm worker uses mpv's subtitle packet reader, timing and bitmap renderer. The
private bridge supplies explicit source timestamps under the mpv core lock.
It creates no mpv audio/video output chains. Unchanged subtitle overlays are
reused using mpv change IDs.

This is an experiment, not a production playback plan. The bridge depends on
the pinned mpv v0.40.0 source and existing Emscripten build cache at
`/Volumes/seed2/Projects/webmpv/build`. It replaces the client.c translation unit
to access internal APIs; it is not a public libmpv extension interface.

## Reproduce

Run from the repository root with the existing generated web player assets,
Playwright, installed Google Chrome, FFmpeg with libx265, and the pinned build
cache available. The fixture uses `fixtures/DejaVuSans.ttf`.

```sh
python3 experiments/mpv-subtitle-service/prepare.py
python3 experiments/mpv-subtitle-service/build.py
node experiments/mpv-subtitle-service/run.mjs
python3 experiments/mpv-subtitle-service/compare.py results/mpv-subtitle-service/<correctness-run>
PERF=1 node experiments/mpv-subtitle-service/run.mjs
```

Run correctness first and performance sequentially on an otherwise quiet host.
The harness prints its unique result directory. `PERF=1` runs three trials per
arm with two-second warmup and twelve-second measurement. `DIAGNOSTIC=1` checks
startup, resource failures and teardown. Browsers are headed.

## Evidence and limits

[Measured report](../../results/mpv-subtitle-service/2026-09-21T18-42-31.420Z/REPORT.md):
28.4% lower median browser CPU on the authored 720p HEVC Main10/AAC/ASS fixture
in Chrome. Both arms sustained real time. Caption masks matched the ordinary
Software mpv renderer at the sampled timestamps.

The qualified fixture has no B frames and one-second GOPs. Earlier B-frame,
long-GOP and combined seek tests exposed existing remux failures; their raw
results are retained. Correctness seeks exercise the subtitle component with
an injected clock, not synchronized native video seeking. The service stages
the entire input and imposes a 16 MiB limit. This does not qualify the user's
original MKV, Firefox, large files, remote transport or production lifecycle.
See the report for exact failures, cleanup observations and promotion gates.

## CPU attribution controls

The harness also accepts comma-separated `MODES` with `PERF=1`:
`blank` (idle page), `direct` (pre-remuxed MP4), `native` (incremental remux
without subtitle service), `idle-subs` (service loaded without render ticks),
`render-only` (subtitle render/tile conversion without overlay transfer), and
`candidate` (complete prototype). These controls do not change production routes.

Prepare the direct control without re-encoding:

```sh
ffmpeg -i build/mpv-subtitle-service/fixtures/qualified.mkv -map 0:v:0 -map 0:a:0 -c copy -tag:v hvc1 -movflags +faststart build/mpv-subtitle-service/fixtures/direct.mp4
MODES=native,idle-subs,candidate,candidate,idle-subs,native,native,idle-subs,candidate PERF=1 node experiments/mpv-subtitle-service/run.mjs
MODES=blank,direct,render-only,render-only,direct,blank,blank,direct,render-only PERF=1 node experiments/mpv-subtitle-service/run.mjs
```

Always report process CPU separately: summing Chrome's main process into the
player number includes substantial idle-browser cost on this host. The
`render-only` arm still converts subtitle tiles into surfaces, but suppresses
full overlay bitmap creation/transfer and presentation.

## Remux failure regression (2026-09-21)

The reproduced B-frame rejection and long-GOP stall were fixed in the local
packet-copy bridge. Current window/worker ownership and combined subtitle/video
seeks pass. See the [failure investigation](../../results/mpv-subtitle-service/remux-analysis-20260921T212056Z/REPORT.md)
for root causes, the task-only source patch, and qualification boundaries.

After rebuilding the packet-copy engine, run from the repository root:

```sh
OWNER=window node experiments/mpv-subtitle-service/remux-failures.mjs
python3 experiments/mpv-subtitle-service/verify-remux-packets.py results/mpv-subtitle-service/<window-run>
node experiments/mpv-subtitle-service/remux-failures.mjs
COMBINED=1 FIXTURE=rejected-bframes node experiments/mpv-subtitle-service/run.mjs
python3 experiments/mpv-subtitle-service/compare.py results/mpv-subtitle-service/<combined-run>
```

Repeat the combined check for `FIXTURE=rejected-long-gop` and `FIXTURE=qualified`.
`COMBINED=1` performs synchronized native-video and mpv-subtitle seeks. Without
that flag, the original component-only clock-injection test remains available.
The remux harness verifies compositor frame timestamps and sustained progression;
window runs also retain bounded MP4 prefixes for A/V packet-identity checks.
