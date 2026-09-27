# mpv experiment review and fixes

Review baseline: `ede8750e`. Work is confined to the isolated JSPI/Asyncify
experiment. Player API code and production assets are outside this change.

## Findings fixed

1. **Audio faults could leave queued PCM playable.** The worklet stopped its
   running flag after invalid traffic, but a later state message could restart
   the old queue. Malformed buffers could also throw out of the callback. Faults
   now clear the queue and permanently reject further playback. The host cancels
   pending source work, disposes the scheduler and obtains a stop acknowledgement.
   The three new worklet regressions fail against the old worklet; that output is
   preserved in `old-worklet-regressions.log`.
2. **Close waited behind a pending load RPC.** Close now cancels the finite source
   outside the RPC chain, then serializes native teardown. Browser regressions
   wait for the server to observe an actual held HTTP request before closing;
   close must finish within 1.5 seconds, without using the five-second read timeout.
   Active and suspended-context close are also checked. Repeated initialization
   is rejected before allocating another engine, timer or port.
3. **Source replacement reset the device rate to 48 kHz.** The host now preserves
   its configured rate. A 44.1 kHz replacement regression checks the AO setting;
   this does not qualify general resampling fidelity.
4. **Evidence verifiers accepted incomplete records.** Both old verifiers accepted
   removal of every input/source/archive binding. The subtitle verifier also
   accepted empty-but-equal text/cancellation frame arrays. Those reproductions
   are in `old-verifier-reproductions.json`. Verification now requires the exact
   input set, complete pixel geometry/hash/time records, runtime identity, exact
   case coverage and build binding. Optimized Python cannot bypass assertions.
5. **The final link recompiled unbound mpv sources and headers.** Checking static
   archives did not cover `player/client.c`, included headers or configuration.
   Fresh dependency builds now hash the mpv source/object trees, installed headers
   and pkg-config files. Links check those inputs, the archive set and compiler
   identities before and after linking; they freeze the dependency record and
   audit script. Legacy builds are rejected for new links, without adding
   retrospective provenance to old outputs.

## Validation

- 20 targeted host tests: seven worklet, six dependency-provenance and seven
  evidence checks. Commands, source hashes and raw logs are recorded in `host-final/`; reviewed sources are in `sources/`.
- Preflight against the earlier audio binary: 12/12 browser cases passed. These
  runs validate the host fixes but do not satisfy the new build-provenance gate.
- Fresh binaries: **17/17 subtitle cases and 12/12 audio cases passed**, then both
  independent verifiers passed. See `summary.json`,
  [subtitle records](../mpv-subtitles-review-01/result.json) and
  [audio records](../mpv-audio-review-01/result.json).
- `rejected-records.json` records rejection of missing inputs, missing cases,
  empty subtitle frames and optimized-Python assertion bypass.
- Both private backends ran without COOP/COEP or SharedArrayBuffer; Asyncify
  disabled both JSPI APIs. The pthread subtitle reference used `same-origin` /
  `require-corp`. Subtitle pixels and the 48 kHz PCM samples remain exact.

The new dependency build uses the existing private audio/subtitle decoder set for
both service links. The subtitle service still enforces `vid=no`, `aid=no` and
zero AO/VO chains. Presence of other decoders does not qualify their use.

Audio faults intentionally abandon the poisoned Wasm instance; the harness
terminates its Worker. Normal close must return all native handles/task slots.
No performance or device claim is made. Player integration, compressed audio,
multichannel/resampling fidelity, long-media endurance, other browsers and
release qualification remain separate.
