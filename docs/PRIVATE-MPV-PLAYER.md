# Private mpv in Player

Player uses the existing `remuxRuntime` selection for the qualified mpv services.
Omitting the option means `auto`: pthread on an isolated page; otherwise JSPI
when both browser APIs are present, then Asyncify. `on` forces private selection,
`off` retains pthread, and `jspi` / `asyncify` select one backend explicitly.
There is no retry through another runtime after a service failure.

The admitted private services are deliberately bounded:

- Embedded ASS/SSA, SubRip, mov_text, PGS and VobSub on inspected finite files,
  with browser video/audio and an mpv subtitle overlay.
- One 48 kHz stereo `pcm_s16le` audio stream, with browser video and actual
  AudioWorklet consumption. The audio service can compose with those subtitles.
- Existing finite-file remux and FLAC24 transcode routes remain available.

Private Hybrid/Software playback, mpv video output, compressed mpv audio codecs,
multichannel output, resampling fidelity, external subtitle composition and
nested streaming resources remain outside this qualification. The tested
browser is Chrome 153.0.8010.53 on macOS. Disabling JSPI in Chrome establishes
the Asyncify path's independence from those APIs; it is not Firefox/Safari evidence.

## Integration

`NativePlayer` passes the selected runtime into its subtitle service and creates
the corresponding audio owner. The shared subtitle worker retains the normal
deadline scheduler. Private mpv calls run through the cooperative scheduler;
source reads use the production identity/authorization-aware readers. Neither
private service requires SharedArrayBuffer or COOP/COEP.

Audio publication has an 8192-frame bound, acknowledged epoch resets, consumed
PCM feedback and a terminal transport fault state. Seek and rate transitions
reset the publication epoch. Context suspension pauses video, and user pause
cancels automatic resumption. Close cancels pending reads before waiting for
serialized native teardown. EOF drain tasks are canceled by seek or destroy; [deterministic replay tests](../results/jspi-asyncify/private-mpv-player-eof-regression-01/result.json) fail against the previous implementation and pass after the fix. The campaign also repaired a pthread context-resume
race and retained the pthread reader's cancellation turn during subtitle close.

Install all four provenance-verified services with:

```sh
python3 scripts/install-private-mpv.py --builds /path/to/verified-builds --runtime-root .
npm run build
```

This creates `web/engine-mpv-{subtitles,audio}-{jspi,asyncify}`. Each loader checks
manifest identity, Wasm and glue hashes, backend exports and private memory.
`web/private-mpv/` retains the reviewed MIT grant; Player integration is Apache-2.0.
Local beta assembly verifies the complete optional service set and its notices.

## Reproduction and evidence

The freezer validates the original component fixture hashes, derives longer
finite playback fixtures using recorded FFmpeg commands, and hashes every
served runtime and media file. It refuses an existing destination.

```sh
python3 scripts/freeze-private-mpv-campaign.py --fixtures /path/to/mpv-frozen/fixtures --out build/mpv-campaign
node tests/private-mpv-campaign.mjs build/mpv-campaign results/new-mpv-player
node tests/private-mpv-lifecycle.mjs build/mpv-campaign results/new-mpv-lifecycle
node tests/private-mpv-cpu.mjs build/mpv-campaign results/new-mpv-player results/new-mpv-cpu
```

The [final playback matrix](../results/jspi-asyncify/private-mpv-player-campaign-05/result.json)
passed **31/31** cases. The [lifecycle matrix](../results/jspi-asyncify/private-mpv-player-lifecycle-03/result.json)
passed **18/18**, with observed close calls between 1.3 and 8.6 ms.
Private audio clock p95 stayed below 142 ms in the seek/rate campaign (150 ms gate).
These are consumed-PCM clock estimates, not acoustic latency measurements.

The [route extension](../results/jspi-asyncify/private-mpv-player-routes-02/result.json)
passed **12/12**: local Direct subtitles, local remux subtitles, local PCM service
and PCM24 plus subtitles. The latter uses private FLAC transcode; the pthread
reference selects its broader mpv audio service. The initial integration passed **61/61** Player and lifecycle cases on one
frozen runtime. A later cadence review added a private audio clock deadband:
[9 playback cases](../results/jspi-asyncify/private-mpv-player-clock-fix-01/result.json),
[6 route cases](../results/jspi-asyncify/private-mpv-player-clock-routes-01/result.json)
and [10 lifecycle cases](../results/jspi-asyncify/private-mpv-player-clock-lifecycle-01/result.json)
passed again on the corrected audio host. [Runtime differences](../results/jspi-asyncify/private-mpv-player-clock-regression-01/runtime-diff.json)
show that no subtitle executable changed. The subtitle CPU row is retained
under its original hashes; the PCM CPU row uses the new snapshot.

The final playback matrix covers all three runtimes, five subtitle formats,
audio-only and composed service ownership, pixel comparison, exact PCM capture,
pause, seek, 2x rate, context suspension, replacement, EOF/replay and cleanup.
Additional policies cover isolated `on`, isolated forced Asyncify, and explicit
rejection for non-isolated `off` and unavailable required Wasm. Lifecycle tests
cover held reads, permission rejection, mismatched assets, active/suspended
close and terminal worklet faults.

Earlier runs remain under `results/jspi-asyncify/private-mpv-player-*`. They
retain fixture-path and asset-snapshot mistakes, the pthread suspension failure,
and its subsequent resume-race fix. The first CPU attempt was interrupted for
the EOF/replay fix; its values are withheld. The initial PCM CPU campaign subsequently rejected three private-runtime
windows for excess dropped frames; its PCM figures are withheld. The audio
controller now ignores ordinary clock noise and uses sustained-drift thresholds
before changing browser rate. This is a bounded correction, not proof that rate
assignments alone caused every rejected frame. The first route extension also
retains two incorrect harness assumptions: remote embedded subtitles cannot
use Direct transport, and pthread PCM24 chooses selective mpv audio while the
restricted private service uses FLAC transcode. Failed results do not count as qualification.

CPU results are a separate matched campaign. Every row gets a fresh Chrome
launch, the maintained 150-second startup completion gate, a recorded idle
observation, three rotated rounds, five-second warmup and 20-second measurement.
Total process CPU is expressed as a percentage of one core, without subtracting
idle. Failed playback, process turnover and cleanup failures invalidate a cell.
These values must not be compared as matched reductions against older README runs.

## Published CPU results

Chrome 153.0.8010.53, Apple M1 (8 logical CPUs, 8 GiB), macOS/Darwin 25.5.0.
Medians and ranges below are percent of one core for the complete Chrome process
set. Each published runtime has three passing windows. There is no idle subtraction
or claim of fresh-launch reproducibility from these three rounds within one row launch.

| Fixture and route | pthread | JSPI | Asyncify |
| --- | ---: | ---: | ---: |
| `m0-long.mkv`, `native-remux-mpv` | 19.8 (19.8–22.7) | 22.6 (22.5–23.3) | 23.2 (22.1–23.2) |
| `pcm-long.mkv`, `native-video-mpv-audio` | Withheld | 30.4 (30.0–32.2) | 30.0 (29.9–31.8) |

The [subtitle row verifier](../results/jspi-asyncify/private-mpv-player-cpu-02/verification-m0-long.mkv.json)
accepts its nine windows and excludes the failed PCM portion of that archive.
The [corrected PCM verifier](../results/jspi-asyncify/private-mpv-player-cpu-03/verification-pcm-long.mkv.json)
accepts six private-runtime windows and excludes all three pthread control attempts:
one control window dropped 117 of 600 frames and failed the existing 1% gate.
The other two control windows do not establish a three-round median. Its cause
has not been isolated; the raw control results remain in the archive.

The earlier PCM attempt rejected two Asyncify windows (6/599 and 9/600 drops)
and one JSPI window. None of that attempt's PCM CPU values are published.
The clock fix and new launch passed all six private windows, but this does not
isolate the rate controller as the sole cause of the earlier dropped frames.
The two published rows retain their separate original manifests. This table
compares full configured paths, not standalone mpv or suspension overhead.

## Release boundary

These are local Player results, not a published release. Tagged assembly also
requires clean `privateMpv` source/configuration/artifact bindings. The release
consumer gate now requires private subtitle/audio, composed-service,
cancellation and asset-mismatch cases against the exact archive. The existing
local component builds and this source-tree campaign do not satisfy that gate;
the archive consumer runner now implements those cases, and a tagged release still requires passing results against its exact archive.
No device, long-duration, broad codec or additional-browser claim is made.
