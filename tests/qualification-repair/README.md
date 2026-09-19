<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Permanent September 16 repair regressions

Run from this directory with the generated qualification corpus linked as `fixtures`.
All source/fixture identities are preserved; no competitor runs are required.

```
export TMPDIR="$PWD/tmp"
node tests/startup.mjs
node tests/startup-negative.mjs
node tests/tracks.mjs
node tests/preselected.mjs
node tests/tracks-subtitles.mjs
node tests/software-diagnostic.mjs
python3 tests/generate-tail-repro.py
node tests/tail.mjs
python3 tests/mpv-tail-reference.py
```

The default browser suite uses installed Chrome and Playwright Firefox. `tail` and
`software-diagnostic` preserve unresolved findings; executing them is not a pass
claim. Inspect `results/` and the report. Software tests instrument only JS timing
boundaries; native Wasm/glue remains unchanged. Stock Firefox confirmation is a
separate harness and is not inferred from Playwright results.

`fixtures/manifest.json` and `performance-manifest.json` identify the fixture bytes.
`tests/generate-tail-repro.py` also creates a two-second A/V, ten-second ASS-tail
reproducer from C01. These binaries and fonts are not embedded in this patch.
The qualification lab preserves generators, generation commands, hashes and font
notices. Native ASS/adaptation optional builds are not required for these tests.

## Follow-up regressions

```
node tests/native-eof.mjs
node tests/tail-contract.mjs
BROWSER=firefox node tests/tail-contract.mjs
CASE_IDS=MIN-tail MODE=software node tests/tail-contract.mjs
BROWSER=firefox CASE_IDS=MIN-tail MODE=software node tests/tail-contract.mjs
BROWSER_EXECUTABLE='/Applications/Firefox.app/Contents/MacOS/firefox' node tests/software-standalone.mjs
```

The standalone Software test records the selected executable and exact version,
uses a fresh lab profile, and fails below27 presented canvas updates/second or
without moving pixels, audio signal, seek recovery and cleanup. It uses the same
P720 source and960x540 presentation size. No browser settings change image quality,
frame rate or decoder choice. Default executable is the existing Playwright Firefox;
it remains a failing sustained-output configuration in the recorded146/153 builds.
Stock Firefox156 passes this short screen with the unchanged Software Wasm/glue.
Do not replace old failures with newer-browser results or infer endurance.

Tail-contract success means a prompt explicit limitation plus position/intent
recovery. It does not mean subtitle-only presentation after AV EOF is supported.
The original tail diagnostic remains available and records every raw outcome.
