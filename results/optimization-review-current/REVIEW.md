# Review of the local playback optimization integration

Reviewed HEAD: f97588443ff4d2a043a2fd8500fb73bd45e656e1 plus the saved uncommitted integration.
Saved patch SHA-256: e9742273e86ac4ca1d3a51e8f58415ffd5809b54f747c9d200a5898d0df4926f.
No implementation changes, commits or remote mutations were made during review.
New review harnesses and evidence are saved in this directory.

## Findings

### P2 — Preserve source dimensions when configuring libass

Location: `native/subtitles/ass.c:39`, with caller `src/internal/native-ass.ts:79`.

`ass_set_storage_size` receives the resized canvas dimensions, identical to
`ass_set_frame_size`. Storage size is the video source/layout size, not the output
raster size. The pinned libass implementation computes blur scaling and, for
`ScaledBorderAndShadow: no`, border/shadow scaling as output size divided by layout
size. Supplying output size for both forces these scale factors to one. A real
Chrome rendering test on a 640x360 source shows a 10-pixel border remaining 10 pixels
at 320x180 instead of 5. Authored blur also uses this factor, including scripts
whose borders use the scaled setting. Existing qualification uses
`ScaledBorderAndShadow: yes` and does not cover this distinction.

Pass the actual video storage/layout dimensions separately from output dimensions;
account for pixel aspect ratio where qualified. Add a resize fidelity regression.
The pinned reference implementation is `libass/ass_render.c:1005-1056`; mpv's
`sub/sd_ass.c:762` passes `video_params.w/h` to `ass_set_storage_size`.

Evidence: `resize-style.json`; run `node results/optimization-review-current/resize-style.mjs`.

### P2 — Keep the accepted subtitle presentation when selection fails

Locations: `src/internal/native-ass.ts:60-62`, `native/subtitles/ass.c:28-33`,
`src/internal/native-player.ts:253`.

Add a valid selected ASS attachment, add a malformed ASS attachment with
`select:false`, then select the malformed track. The call rejects, but `load()`
already hides the canvas and the native wrapper already freed the valid track.
The public state still says the original track is selected and subtitles are
visible, while its overlay is now hidden and its parsed track has been lost.
Parsing a candidate must succeed before replacing the accepted track; failed
selection must restore/preserve display and renderer state.

Evidence: `result.json` → `invalidSelection` (real libass rejection).

### P2 — Roll back overlay allocation when Worker construction fails

Location: `src/internal/native-ass.ts:25-28`.

The constructor appends a canvas before creating its Worker. If Worker construction
throws (for example, deployment CSP blocks it), assignment to NativePlayer.ass
never completes and candidate disposal has no reference to that canvas. Injecting
that constructor failure through the public addSubtitle API leaves one additional
canvas after every rejected attempt: 1, 2, 3. Whole-player destroy eventually
removes the root contents, but retries accumulate unowned resources throughout the
active player's lifetime. Allocate before DOM attachment or clean up partial
construction in a catch/finally path.

Evidence: `result.json` → `workerConstructor`; this is browser fault injection,
not a separate real-CSP deployment test.

### P2 — Keep selection independent of subtitle visibility

Location: `src/internal/native-player.ts:118`.

Native ASS track metadata includes `subsVisible` in the selected flag. Calling
`subtitleVisible(false)` changes the same source-scoped track from selected=true
to selected=false even though no track selection changed. This contradicts the
public API's separate selection/visibility state and causes consumers of
subtitleTracks to see “no selected track” when subtitles are merely hidden.
Keep the selected flag tied to the chosen track; use visibility only for rendering.

Evidence: `result.json` → `hiddenSelection` (true → false → true).

## Verification and limits

Chrome 152.0.7977.83 browser reproductions completed and cleaned up.
The following existing targeted regression set still passes 36/36:

```sh
node --test tests/plan-admission.mjs tests/optimization-contracts.mjs tests/remux-buffering.mjs tests/native-selection.mjs tests/retained-codec-worker.mjs tests/video-codec-config.mjs
node results/optimization-review-current/reproduce.mjs
node results/optimization-review-current/resize-style.mjs
```

Review inspected gain, source/routing admission, Opus/FLAC changes, packet ownership,
ASS lifecycle/rendering and packaging diffs. No full performance sweep, new Wasm
build, end-to-end streaming qualification or Firefox review rerun was performed.
The already documented long unequal-tail and release-source-correspondence blockers
remain; they are not counted as newly discovered regressions here.
