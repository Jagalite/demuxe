# Optimization integration review

Review of uncommitted integration over f2491f62c777fa55225aed9b0b7ecf2e340accf7. Production source unchanged.

## P1: Audio tails bypass bounded preparation

`native/remux/remux.c:396` yields only on selected video packets while video exists. A 1-second H264 video with 30-second PCM24 audio decodes/encodes all 1,440,000 samples while paused. The inherited fragment condition is unsafe when extended to audio decoding/encoding. Bound work independently of arriving video packets and maintain mux/interleave correctness through unequal track ends.

Reproducer: `node build/optimization-review/audio-tail.mjs`. Raw failing assertion: `build/optimization-review/audio-tail.log`; browser counters: `results/optimization-integration/stage2/lifecycle-chrome-1789510563117/result.json`.

## P2: Adapted track identities differ from packet-copy identities

`src/internal/state.ts:16` handles only plan `remux`; `adapted-flac` audio lacks ff-index and becomes `audio:native:3`, rather than `audio:stream:2`. Selecting the second track through selectAudioTrack then setMode('hybrid') fails with Cannot preserve explicit public track selection across playback modes. The existing track test uses the legacy selectTrack API and misses publicSelections. The equivalent source-index branches at unified-player.ts:297 and :327 also need the adapted plan.

Reproducer: `node build/optimization-review/public-track-02.mjs`; log of the same name. Initial harness attempt referenced a nonexistent state.tracks property; retained separately and not counted as a product failure.

## P2: Fixed seek frame tolerance rejects low-frame-rate media

`src/internal/native-player.ts:191` accepts only frames within 150 ms of the requested timestamp. A paused buffered seek to 2.5 s in the 1 fps fixture fails after ten seconds even though the interval belongs to a valid displayed frame. Validate frame coverage or use an appropriate expected presentation timestamp rather than a fixed small difference.

Reproducer: `node build/optimization-review/low-fps-02.mjs`; log of the same name. Initial all-intra fixture was rejected by the existing explicit-reorder-bound gate; the interframe fixture reaches and reproduces the seek failure.

No fixes applied. No commit/push/publication. Existing passing short fixtures do not cover these cases.
