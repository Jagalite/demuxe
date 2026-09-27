# JSPI / Asyncify integration-preparation review

Reviewed the isolated experiment, its runtime bridge, build/relink scripts, media
harness, and evidence verifier. No implementation fixes or production changes
were made during this review.

## Findings

1. **[P2] Enforce the required case identities before accepting a campaign.**
   `experiments/jspi-asyncify/local/summarize.py:46-48` checks counts and unique
   IDs, but does not require the expected profile/runtime/scenario/transport/seek
   combinations. In an isolated copy, replacing the JSPI cancellation case with
   another reader-failure case under a unique ID still produced a successful
   64-check, 48-candidate summary. This contradicts the documented missing-case
   rejection guarantee. Derive the expected identities and fixture assignments,
   reject missing or unexpected cases, and require the source snapshot map.
   Evidence: `missing-matrix-case-repro.json`.

2. **[P2] Serve the same source bytes that the runner snapshots.**
   `experiments/jspi-asyncify/ffmpeg/tests/run-media.mjs:32-35` reads and hashes
   sources independently of the server's lazy cache at lines 22 and 57. An edit
   between snapshot creation and the first request changes the executed bridge
   without changing its recorded source hash. A temporary copy of the runner's
   initialization/server code reproduced different recorded and served hashes.
   Populate the serving cache from the snapshot bytes, or serve the snapshots;
   freeze and identify all runtime helpers and replacement fixtures as well.
   Evidence: `source-snapshot-repro.json`.

3. **[P2] Verify relink libraries against hashes from the original build.**
   `experiments/jspi-asyncify/ffmpeg/scripts/relink-ffmpeg.py:30-36` hashes archives
   only when relinking. The original builder records source files and final
   engines, but no archive hashes; checking those original records at lines
   12-15 cannot detect changed libraries. A temporary prepared prefix with
   substituted archives passed preflight and reached the intercepted compiler
   call. No compiler was executed in this reproduction. Record archives and the
   link command at the original build, verify them before reuse, and observe the
   relink toolchain rather than copying the old toolchain record.
   Evidence: `unverified-relink-repro.json`.

## Validation and limits

- Reran 30 host/ABI guards: 11 Emscripten audit, 11 host guards, and 8 no-JSPI
  host tests; all passed.
- Reproduced all three findings using temporary copies. Original campaign
  records, build artifacts, and implementation sources were preserved.
- These findings weaken evidence verification and repeatability; they do not
  establish that the existing 64 component outcomes are false.
- This review did not rerun browser/media campaigns. Player/MSE integration,
  full mpv operation, and release qualification remain pending.
