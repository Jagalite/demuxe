<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# R47 — qualified local owned-buffer profile

**Disposition: QUALIFIED_LOCAL_PROFILE, with the limits below.**

The integrated `web/native-remux-worker.js` SHA-256 is `89447a41174c2e8786b9fc653e176b92cb1024d40216f4da6662fe69a76c165b`, identical to the isolated worker used for qualification. A single emitted Uint8Array may bypass gathering only if its non-shared ArrayBuffer is fully owned (zero offset and full length). All other batches retain the original gather. Selection, source authority, native interfaces and optional-profile admission are unchanged.

## Value-qualified scope

- Target: headless desktop Chrome 152.0.7977.83, macOS 26.5.2, Apple M1 MacBook Air on AC power.
- Source: the recorded 12-second H.264/AAC local fixture with small output batches (`build/optimization-fixtures/gain.mp4`; generation command in `experiments/optimization-integration/fixtures.py`, exact source hash in the comparison runs).
- Requested operation: explicit Native remux, unchanged selected A/V, no required subtitles or filters. The cheaper Native direct route remains available and has not been displaced.
- Primary metric: application gather-copy bytes over complete remux output. Reference 1,042,098 bytes; candidate 39,587 bytes, **96.2% fewer**, exceeding the predeclared 25% threshold. Native heap-to-owned-buffer copies and browser-internal copies still exist. No CPU, power, hardware-decoding or end-to-end latency improvement is claimed.
- Complete captured reference/candidate output has the same SHA-256 `48b760740df631d56534ad894f7622be6417a24f1b461c0c9f68a1e217d717e8`; all 25 append sizes match. The independent oracle matches all 360 video and 564 audio packet hashes to the input.

## Correctness and endurance

Three ownership tests cover transfer detachment, partial/shared view isolation, multi-piece order and empty batches. Four FLAC adaptation cases pass exact PCM/count and video packet/timestamp comparisons, including B frames, nonzero starts, offset audio and selected S16 mono. Nine lifecycle cases pass: bounded/gain playback, authenticated ranges, cancellation of a blocked read, invalid ranges, changed source identity, stale-generation output, and rejected PCM32/float/surround inputs. These extend correctness coverage; they do not make every profile an endurance- or value-qualified workload.

The candidate passed **100 open/play/seek/destroy cycles**, followed by **1,801.927 seconds of synthetic-source soak** and **142 EOF restarts**, with successful final worker teardown. The run checks continued video progression, empty error lists, queue depth <=1, retained-byte bounds, at most two active workers and Wasm heap <=128 MiB; observed heap stayed 64 MiB. These counters do not establish whole-browser RSS stability or physical audio fidelity. The exact run is `runs/r47-endurance-01/result.json`.

## Real-media control and limits

A 26-second, keyframe-aligned 1080p Big Buck Bunny H.264/AAC excerpt passes complete packet-hash comparison and byte-identical reference/candidate capture, with 53 identical append sizes. Gather-copy reduction is **8.96%**, below the 25% value gate for that workload. It is a successful correctness control, not a value-qualified movie result. Attribution and preparation hashes are retained beside the captures and in `docs/MEDIA-NOTICES.md`.

A different, non-keyframe-aligned excerpt fails the unmodified forced-remux baseline at `rm_start` with FFmpeg -68 while Native direct passes. Its cause is unresolved and its failed remux route is outside this qualification. Required subtitles, full-length movie endurance, additional browsers, mobile, actual Safari, other codecs, device audio output and broad production performance remain separate gates.

The change is integrated locally and is uncommitted. Rollback is the inverse of `r47-single-owned.patch`; the exact prior worker is preserved at `runs/engine-baseline/reference-native-remux-worker.js`. No release, tag, default-route promotion or external publication occurred.
