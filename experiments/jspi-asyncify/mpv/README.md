# Actual mpv continuation experiment

This directory extends the reviewed package with a real Emscripten/libmpv service.
All development is confined to the experiment worktree and fresh external builds.
The Player API, route selection and production engine directories are unchanged.

The subtitle component passes 17/17 Chrome cases in
[`mpv-subtitles-browser-03`](../../../results/jspi-asyncify/mpv-subtitles-browser-03/result.json):
ASS with an attached font, SRT, mov_text, PGS and VobSub; real composed pixels;
seek/replay; bitmap expiry and recovery; close/recreate with another source; and
cancellation after an observed pending read. Candidate pixels exactly match the
frozen pthread reference. Every render checks that no AO/VO chain exists.

Both private-memory backends run without COOP/COEP or SharedArrayBuffer. The
pthread reference runs with `same-origin` / `require-corp`. Asyncify cases remove
both JSPI APIs. This is local Chrome component evidence, not other browsers or
deployment policy qualification. The restricted audio follow-up below has its own passing records and boundaries.

## Continuation ownership

The module is linked with ordinary Emscripten glue: neither `-sJSPI` nor
`-sASYNCIFY`. JSPI and the Binaryen post-link Asyncify transform share the raw
cooperative scheduler as their sole continuation owner. `engine.mjs` supplies
explicit, namespaced imports; missing imports throw instead of silently using a
stub. Asyncify retains one saved stack per logical task, not Emscripten's global
Asyncify state. The actual mpv dispatch and thread-pool implementations are kept.

The adapter also saves/restores libc `errno` and Emscripten stack bounds per task.
`context-probe.c` checks nested tasks, stack locals, heap allocations, errno and
joins under both backends. After completion all 24 slots are reusable.

The full mpv compile required the cooperative thread header to preserve the
`common/common.h` include normally supplied by `threads-posix.h`. The initial
failure and narrow resume are preserved in `mpv-builds-01`. The subtitle timing
notification now directly posts to its owning Worker; it does not reenter mpv.
Nested AVIO resources are rejected in this finite-source service.

The subtitle run reached five live tasks; its maximum observed Asyncify save was
5,000 bytes. These are observed bounds for these fixtures, not endurance limits
or a CPU comparison. Each module reserves 24 C stacks of 512 KiB plus bounded
Asyncify stacks. The Wasm heap starts at 64 MiB and is capped at 128 MiB.

## Build and reproduce

Use a fresh output directory for every attempt. `--sdk` identifies Emscripten
4.0.14; `--tools` contains Meson/Ninja; `--downloads` contains the archives pinned
in `sources.lock.json`. Outputs stay outside the repository.

```sh
python3 -B experiments/jspi-asyncify/mpv/scripts/build-dependencies.py \
  --profile subtitles --out "$OUT/mpv-deps-new" --sdk "$SDK" \
  --downloads "$DOWNLOADS" --tools "$TOOLS"
python3 -B experiments/jspi-asyncify/mpv/scripts/link-subtitles.py \
  --deps "$OUT/mpv-deps-new" --out "$OUT/mpv-subtitles-new" --sdk "$SDK"
```

`freeze-inputs.py` copies a manifest-verified pthread service, repository fixtures
and supplied maintained PGS/VobSub fixtures, generates SRT/mov_text replacements
and a deterministic PCM16 fixture, and records their hashes. Pass fresh
`--out build/jspi-asyncify/mpv-frozen`, `--baseline`, `--manifest` and `--bitmaps`.
The existing campaign snapshot is already present locally; never overwrite it.

```sh
MPV_SERVICE_BUILD="$OUT/mpv-subtitles-new" RUN_NAME=mpv-subtitles-new \
  node experiments/jspi-asyncify/mpv/tests/run-subtitles.mjs
python3 -B experiments/jspi-asyncify/mpv/scripts/verify-subtitles.py \
  --run results/jspi-asyncify/mpv-subtitles-new
```

The verifier requires the exact 17 cases, pixel identity, cleanup, policy facts,
source snapshots and matching build artifacts. Binary artifacts and dependency
archives remain local; source snapshots, commands, compiler failures, audits and
hashes are retained under `results/jspi-asyncify/mpv-builds-01/`.

## Integration boundary

Next integration must expose asynchronous service calls and serialize user
operations through the adapter. A capability failure can select an independently
qualified alternative; source failures, authentication, cancellation, traps and
asset mismatches cannot be treated as lack of JSPI. A trapped module is disposed.
Runtime-specific asset/cache identities and explicit route admission are required
before connecting this to Player. No automatic fallback is installed here.

Remaining release gates include real device audio, broader media/codec coverage,
long-media endurance, memory pressure, performance and other browsers. The
subtitle component result does not establish full mpv playback readiness.

## Restricted audio follow-up

The actual audio-only service now passes the two-backend
[PCM/AudioWorklet campaign](../../../results/jspi-asyncify/mpv-audio-browser-05/REPORT.md).
Both backends render exact 48 kHz stereo PCM16 samples through a real AudioWorklet,
with pause, AudioContext suspension, paused-clock checks, seek, 2x speed, EOF and
source replacement. This is narrower than full audio qualification: device,
compressed-codec, multichannel, resampling and endurance gates remain open.

`native/audio-service.c` keeps mpv audio decoding and the maintained browser AO;
video and subtitles are disabled. The harness Worker copies private-ring PCM into
transferred blocks and accepts epoch-tagged real-consumption feedback. The
worklet enforces an 8,192-frame queue bound and rejects stale or malformed
traffic. User pause gates playback independently of the AO running flag, and
context suspension pauses mpv before marking the device stopped. These fixes
came from preserved failing runs; no mpv core scheduling change was needed.

```sh
python3 -B experiments/jspi-asyncify/mpv/scripts/build-dependencies.py \
  --profile audio --out "$OUT/mpv-audio-deps-new" --sdk "$SDK" \
  --downloads "$DOWNLOADS" --tools "$TOOLS"
python3 -B experiments/jspi-asyncify/mpv/scripts/link-subtitles.py \
  --profile audio --deps "$OUT/mpv-audio-deps-new" \
  --out "$OUT/mpv-audio-new" --sdk "$SDK"
MPV_AUDIO_BUILD="$OUT/mpv-audio-new" RUN_NAME=mpv-audio-new \
  node experiments/jspi-asyncify/mpv/tests/run-audio.mjs
python3 -B experiments/jspi-asyncify/mpv/scripts/verify-audio.py \
  --run results/jspi-asyncify/mpv-audio-new
node --test experiments/jspi-asyncify/mpv/tests/audio-worklet.test.mjs
```

The test Worker is an experimental component host, not a replacement for the
production Player worker. Production integration needs asynchronous control and
flush acknowledgements, physical output-latency feedback, device lifecycle and
runtime-specific qualification. The finite-source bridge does not support nested
network resources. A new Wasm/worker instance must get a fresh worklet transport;
reusing an old transport with native epoch counters reset to zero is unsupported.


## Review fixes

The follow-up review adds terminal audio fault handling, an acknowledged stop
that clears queued PCM, close-time cancellation outside the serialized RPC queue,
duplicate-init rejection and preservation of the configured sample rate on source
replacement. Browser coverage now also checks pending-read close, active close,
suspended-context close, poisoned-host rejection and 44.1 kHz replacement settings.
The latter is a configuration regression, not a general resampling qualification.

The service linker now verifies every dependency source/header/configuration file
it can read, the archive set and compiler identities before and after linking. It
freezes the dependency build record and the actual Wasm audit script alongside the
service sources. Older builds lacking these records are rejected for new links;
no provenance is retroactively added to historical builds.

Evidence verification requires the exact served input set, complete pixel records,
expected runtime facts and the fresh dependency binding. Empty input maps and
empty-but-equal subtitle frame arrays are rejected. Python optimization cannot
silently disable the verifier's assertions. Original failures and mutation
reproductions are retained in
[`mpv-review-fixes-01`](../../../results/jspi-asyncify/mpv-review-fixes-01/REPORT.md).
