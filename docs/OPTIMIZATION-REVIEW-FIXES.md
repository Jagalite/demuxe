# Review fixes: bounded work, track identity and frame-verified seeks

All three findings from `results/optimization-review/REVIEW.md` are addressed.
Work remains local and uncommitted on the saved integration checkpoint. This does
not complete the wider optimization program or enable automatic FLAC admission.

## Changes

- **Bounded audio tails:** the preparation profile yields after roughly half a
  second of decoded audio even if no further video packet arrives. A single
  decoded frame remains subject to its existing sample cap. The controller limits
  prepared source time separately from MSE buffered intersection. Pausing cannot
  force conversion of an arbitrarily longer audio track.
- **Explicit unequal-tail limitation:** a single combined SourceBuffer may stop
  exposing playable coverage when its shorter track ends. If playing cannot
  progress within the five-second preparation cap, the adapter reports
  `Adapted track timelines cannot progress within the preparation budget; use Hybrid`.
  Explicit Native does not silently change modes. The regression verifies that
  the application can then switch the same source to Hybrid. Long unmatched tails
  are not newly qualified for Native. Existing short duration mismatches remain
  covered by packet and sample comparisons. No valid packet is dropped or clamped.
- **Source-scoped audio identity:** both `remux` and `adapted-flac` use the same
  stream-index identity. Public selections survive Native/Hybrid transitions,
  gain replacement and automatic-selection activation. On return to Native, the
  selected stream is passed to preparation before opening; the default track is
  not temporarily adapted first.
- **Frame-verified seeks:** frame callbacks are registered before issuing the seek and
  accepted only once the browser reports seeking complete at the requested media
  time. Registration cannot wait for the queued DOM `seeking` event, which can
  arrive after the target compositor callback. The callback's frame timestamp can precede the target for low-frame-rate
  or variable-frame-rate content. A future frame cannot satisfy the seek, and a
  retired presentation/generation cannot complete it. The ten-second deadline and
  cancellation cleanup remain. No broad timestamp tolerance or guessed frame rate.

## Regression coverage

`tests/optimization-review-regressions.mjs` adds three real-browser cases:

1. One-second video plus 30-second PCM24 audio: paused work stays below seven
   seconds, remains stable, and the unmatched-tail limitation settles explicitly
   during playback. The source remains usable through Hybrid.
2. Public second-audio selection across Native → Hybrid → Native, gain replacement,
   and automatic selection. The same public track ID persists, and Native's
   preparation/cancellation counters contain only the selected 44.1 kHz stream.
3. Three cycles of buffered seeks at 2.5, 2.75, 4.5 and 2.25 seconds in a 1 fps video. Paused
   playback preserves the worker and generation. Browser canvas pixels agree for
   targets covered by the same frame and differ for a different frame. The test
   waits for actual buffered eligibility after refill; Firefox's first fixed-delay
   attempt exercised the safe regeneration path and was retained as harness evidence.

Chrome and Firefox pass all three cases. Eighteen targeted root contracts pass,
including new stale-generation and low-frame-rate seek contracts. Assembly 15
contains the actual combined streaming delta, compiles, and passes 59 saved
streaming contracts. Full rebuilt HLS/DASH browser qualification remains gated.
Additional fidelity, lifecycle and installed-consumer results are indexed in
`results/optimization-integration/stage3/summary.json`.

## Reproduction

```sh
python3 experiments/optimization-integration/fixtures.py
npm run build
node --test tests/optimization-contracts.mjs tests/remux-buffering.mjs tests/native-selection.mjs
node tests/optimization-review-regressions.mjs
BROWSER=firefox node tests/optimization-review-regressions.mjs
node tests/audio-adaptation.mjs
node tests/audio-adaptation-lifecycle.mjs
```

The maintained FLAC engine was relinked with the same saved FFmpeg 9.0.1 libraries,
locked patches and Emscripten 4.0.14. It has matching new glue and Wasm in a fresh
versioned build directory. Original engine artifacts, failed reproducers, stage 2
results and the laboratory remain preserved. No new dependencies, codec upgrades,
streaming gates or public playback modes were introduced. Earlier cost screens
remain evidence for their original artifact hashes; they were not rerun for this
correctness fix and do not qualify the new artifact's performance.
