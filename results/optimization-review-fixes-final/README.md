# Final review fixes — 2026-09-16

Both findings in `results/optimization-review-final/README.md` are fixed.

- Windowed Native converts controller tuples to public `{start,end}` ranges.
  Buffered ranges and the full source seekable interval now survive state
  normalization, restoring timeline, skip and keyboard control eligibility.
- Routing uses ordinary inspection first. Preparation inspection is loaded only
  after Native rejects the requested presentation and the selected audio is a
  qualified PCM codec. Copy-compatible sources never depend on preparation assets.
  Existing source failure and cancellation guards remain in place.

## Validation

Package 22 SHA-256:
`c5c7c0aab0e6a676a058a8a191a72a05ccf4232d2e9791f614693b74404355c7`.

- Final TypeScript build passed; generated bindings updated. The clean release
  build exposed missing `muxedFrames`/`matchesVideoFrame` declarations, now fixed.
  Earlier combined shell checks continued after the TypeScript failure; the
  original error logs are retained and are not counted as passing builds.
- 38 frame/admission/buffering/fallback/MP4 contracts passed (`contracts.log`).
- Eleven routing cases each passed in Chrome and Firefox, including paired
  policy/no-policy/missing-optional-asset original-track cases, selected audio
  changes, FLAC+ASS+gain, and pause/seek/end/replacement.
- Four Chrome unequal-tail fixtures passed with authenticated range transport,
  ASS+gain, nonzero starts, packet/sample comparisons, seeks and teardown.
  All four assert the public buffered/seekable object ranges.
- `candidate-22/qualification.json` binds commands, harness/log hashes and archive.

Firefox preserves its existing Hybrid route for this generic AVC Matroska
inspection case; Chrome preserves Native. Preparation requests are monitored at
browser-context scope, including worker requests, and must remain zero for all
original-track copy cases. The first package-21 run used an overly broad Native
expectation on Firefox; its failed record is retained. This does not broaden
Firefox Native admission.

These are targeted post-review checks, not replacement evidence for the complete
release matrix or the previous package-20 benchmark. A new isolated clean standard
build and exact tagged-candidate qualification are in progress for release closeout.
No release was published or pushed.

Rerun the checked browser cases using the immutable package-22 extraction:

```sh
DEMUXE_RUNTIME_ROOT="$PWD/build/review-fixes-22/package" node tests/automatic-adaptation.mjs
BROWSER=firefox DEMUXE_RUNTIME_ROOT="$PWD/build/review-fixes-22/package" node tests/automatic-adaptation.mjs
DEMUXE_RUNTIME_ROOT="$PWD/build/review-fixes-22/package" ENGINE_BUILD="$PWD/build/adaptation-clean-01/engine-1789533783050441000" BROWSER=chrome SEEKS=1 COMBINATION=1 REMOTE=1 node tests/unequal-tail-windows.mjs
node --test tests/native-seek-frame-race.mjs tests/plan-admission.mjs tests/remux-buffering.mjs tests/seek-fallback.mjs tests/split-mp4.mjs
```
