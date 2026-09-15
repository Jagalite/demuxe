# Isolated routing regression suite

Run only from the preserved lab. Do not copy dependencies from another checkout. This suite uses existing Demuxe runtime artifacts and never builds a playback engine.

```sh
cd /private/var/folders/p2/hs2582qs5672qbvtm4z5_9840000gn/T/demuxe-adapt.QUfsHU
./run node results/risk-review-20260915T015230Z/run-all.mjs
```

The runner creates a new timestamped `reruns/` directory, fresh Chrome profiles and a fresh local port. It stops its own server, closes each browser context, and returns a nonzero exit when any assertion fails. Current expected failures are the two B-frame/nonzero-start adaptation cases; do not waive them for general media admission. A whole-run eight-minute watchdog bounds playback below twelve minutes even on a failing rerun. Tests explicitly close owned browser contexts on SIGTERM.

Individual groups can be rerun without overwriting evidence:

```sh
./run node results/risk-review-20260915T015230Z/run-all.mjs transitions races ownership
./run node results/risk-review-20260915T015230Z/run-all.mjs buffer-subtitle mute-output
./run node results/risk-review-20260915T015230Z/run-all.mjs faults transport-recovery
./run node results/risk-review-20260915T015230Z/run-all.mjs audio-fidelity policy-timeline
```

Existing source contract tests (22 cases; no build):

```sh
cd repo
../run node --test tests/video-codec-config.mjs tests/native-selection.mjs tests/retained-codec-worker.mjs tests/remux-buffering.mjs
```

`tests/common.mjs` supplies isolated browser creation, result collection and teardown assertions. `web/harness.js` adapts the shared tests to public Player routes and scratch adaptation. `web/adapter.js` is a risk-review copy with small lifecycle fixes. `web/worker.js` retains the existing codec implementation plus explicit test-only crash/hold messages. `web/fidelity-worker.js` is an AUDIO-ONLY audit, skipping video packets without decoding; it is not audiovisual adaptation or playback evidence. Its purpose is comparing decoded PCM and checking audio sample count/padding without hiding the known video mux failure.

`web/libass-loader.js` is libass-wasm 4.1.0's existing loader with two conditional canvas assignments to avoid clearing paused subtitles on redundant resize. The worker/Wasm and fonts remain unchanged. Copyright/license text is retained in the loader and the original distribution remains at `repo/web/adapt/ass-vendor`.

One small additional fixture was generated: `web/edge.mkv`; exact command is `fixtures/generate.sh`, probe and generation log are in `raw`. Do not regenerate it during browser testing. The main 90-second fixtures and existing ASS/font files are reused from the lab.

The seeded rich sequence uses seed `0x51f0792`. The operation order is explicit; the seed chooses short inter-operation jitter. Test fault controls are local-only `/control` and `/fault` endpoints. `risk-crash` and `risk-hold` are synthetic worker protocol messages; the real demux-read crash test first proves a local HTTP body is held while a step is outstanding. HTTP faults use real browser requests to this owned server.

Original failures, earlier test versions and prototypes are preserved in `raw`, `before`, and the earlier lab report/patch. The first gain sampler measured queued transitional audio; `gain-steady` uses a bounded signal barrier and stricter steady amplitude tolerance. The earlier dimension-only ASS resize check is superseded by a visible-alpha assertion. Neither correction weakens the underlying fidelity requirement.

The current test adapter manually chooses FLAC/Opus and makes lossy Opus opt-in. This is not a production routing-policy implementation. The public Hybrid filter constructor and setter still reject the filter; tests use the existing scratch mpv binding for that route.
