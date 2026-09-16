# Optimization integration review

Reviewed uncommitted integration against `cdd1cb5cc2e48f484e58bc0c2f1bc05fb6a7de83`.
The tracked diff remains byte-identical to the saved integration checkpoint.
No implementation files were changed. Browser reproductions used the installed
package-20 runtime, archive SHA-256
`e421e59c9aff09f3738a0c89475d7bd1d6f54b7f7d56da35b9ad825f27979bb7`.

## Findings

1. **P1: Restore public TimeRange objects for windowed Native playback.**
   `src/internal/native-player.ts:124` publishes tuple arrays for both
   `native-buffered` and `native-seekable`. `src/internal/state.ts:5` expects
   `{start,end}` objects, so Player state returns null for both. The Chrome
   audio-tail reproduction has real buffered `[0,0.633]` and seekable `[0,30]`
   data but exposes neither. `src/player/index.ts:348` consequently disables
   timeline and skip controls; keyboard seeks are also disabled. Convert the
   controller's tuple representation at the backend boundary and test the public
   state/component on both tail directions.

2. **P2: Preserve ordinary inspection when optional adaptation assets fail.**
   `src/unified-player.ts:446` selects the preparation inspector for every local
   source whenever automatic lossless policy is enabled. If that optional runtime
   is absent or fails to load, the catch rejects all Native candidates instead of
   retaining normal source inspection. A packet-copy H264/AAC Matroska fixture
   plays Native without the policy but switches to Hybrid with the policy and
   a preparation-runtime 404. Ordinary remux assets remain available. Inspect with
   the ordinary path first, or retry ordinary inspection on optional-runtime
   unavailability without weakening source/integrity/authorization failures.
   Add a paired original-track regression with preparation assets absent.

## Executed checks

- Three targeted real Chrome cases in `reproduce.mjs`; actual state, raw ranges,
  selection diagnostics and failures saved in `reproduction.json`.
- 37 targeted frame, admission, buffering, seek-fallback and MP4 contracts passed
  (`contracts.log`).
- Nine optional-release verifier contracts passed (`optional-release.log`).
- `git diff --check` passed.

Rerun from the integration checkout:

```sh
node results/optimization-review-final/reproduce.mjs
node --test tests/native-seek-frame-race.mjs tests/plan-admission.mjs tests/remux-buffering.mjs tests/seek-fallback.mjs tests/split-mp4.mjs
python3 tests/optional-release.py
```

The new copy fixture was created without re-encoding from
`build/optimization-fixtures/gain.mp4` using `ffmpeg -map 0 -c copy`.
No full browser matrix or benchmarks were repeated for this read-only review.
The previously documented standard-engine clean-build and authorized tagged
release qualification gates remain open; prior passing optional qualification
is not release promotion.
