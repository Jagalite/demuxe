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
