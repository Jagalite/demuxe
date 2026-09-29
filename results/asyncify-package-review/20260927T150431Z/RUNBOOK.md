# Next-stage commands (prepared, not executed)

Run each stage separately after reviewing its output. Start by rechecking shared-checkout status and any active tests/servers. Keep actual integration changes in a dedicated worktree; the commands below operate only on the review working copy and fresh external build prefixes.

## Infrastructure environment

```sh
REVIEW=/Volumes/seed2/Projects/demuxe/results/asyncify-package-review/20260927T150431Z
DEMUXE_REPO=/Volumes/seed2/Projects/demuxe
DEMUXE_SDK="$DEMUXE_REPO/build/emsdk-4.0.14"
python3 -m venv "$REVIEW/python-env"
"$REVIEW/python-env/bin/python" -m pip install playwright
"$REVIEW/python-env/bin/python" -m pip freeze > "$REVIEW/local-checks/python-environment.txt"
export CLANG="$DEMUXE_SDK/upstream/bin/clang"
export WASM_OPT="$DEMUXE_SDK/upstream/bin/wasm-opt"
export CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
cd "$REVIEW/working"
python3 -B scripts/build-dual.py --wasm-opt "$WASM_OPT"
"$REVIEW/python-env/bin/python" -B scripts/run-dual.py --output local-dual.json
"$REVIEW/python-env/bin/python" -B review/run-continuations.py --output local-continuations.json
```

Expected complete suite counts are 94/94 and 27/27; partial runs do not meet this gate. The local compiler differs from the supplied artifacts. Keep its new build record and every failure. The virtual environment install uses the available package version; its frozen version record belongs to this campaign, not the original package.

## Actual FFmpeg build preparation

First address the Emscripten audit finding in `working/` and retain a patch plus focused negative-test evidence. No actual-media runner is supplied yet.

The following runs one build. Repeat with a **new** output prefix for each of `remux/jspi`, `remux/asyncify`, `transcode/jspi`, and `transcode/asyncify`; never reuse a build directory across variants.

```sh
REVIEW=/Volumes/seed2/Projects/demuxe/results/asyncify-package-review/20260927T150431Z
DEMUXE_REPO=/Volumes/seed2/Projects/demuxe
DEMUXE_SDK="$DEMUXE_REPO/build/emsdk-4.0.14"
FFMPEG_TRIAL_OUT=/Volumes/seed2/Projects/demuxe-asyncify-remux-asyncify-trial-01
python3 -B "$REVIEW/working/ffmpeg/scripts/prepare-ffmpeg.py" \
  --repo "$DEMUXE_REPO" --out "$FFMPEG_TRIAL_OUT" \
  --profile remux --suspension asyncify
python3 -B "$FFMPEG_TRIAL_OUT/build-ffmpeg.py" \
  --sdk "$DEMUXE_SDK" --jobs 4 --saved-stack-bytes 65536
```

The builder refuses an existing output and the preparer requires a path outside Demuxe and the package. It reads the pinned Git revision rather than uncommitted source. Recheck the current-versus-pin comparison before using this as evidence for a later checkout. Keep `inputs.json`, `commands.json`, build logs, map and source/glue/Wasm hashes. `build_completed_only` does not authorize runtime admission or establish output correctness.

## Media harness acceptance contract

Implement before running the production suites against these artifacts:

- Own one Emscripten module per worker, bind finite Blob/range reads, initialize remux output/metadata hooks, and await every admitted bridge operation.
- Configure source/size and selected tracks; capture output while retaining existing bounded production semantics. Cancel through an out-of-band path during pending reads.
- Observe non-isolated worker facts and actual continuation backend; make Asyncify work with both JSPI APIs absent.
- Emit exact fixture/tool/source/glue/Wasm identities and raw per-case positive/negative outcomes.
- Compare against matching pthread metadata, packet/timestamp and PCM output. Check source errors, pending-read cancellation, replacement, seek/EOF and disposal after traps.
- Keep served production assets unchanged. Existing Player tests must continue to prove isolated pthread behavior while candidate tests use their own worker and engine URLs.
