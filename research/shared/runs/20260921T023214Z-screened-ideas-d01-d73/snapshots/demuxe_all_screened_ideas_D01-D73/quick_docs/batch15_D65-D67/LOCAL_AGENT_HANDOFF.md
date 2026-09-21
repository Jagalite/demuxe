<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff — D65–D67

## Starting point

Read REPORT.md and evidence/verification.json. These are standalone experiments at a pinned source-lineage snapshot, not production changes. Rebase the investigation against the current repository and its Shaka integration. Do not modify the existing research ledger's unrelated stop decisions or assign new R-numbers without checking the full-key catalogue. D65–D67 are temporary continuation labels.

No automatic playback route should be changed based solely on these screens. Do not introduce another HLS/DASH scheduler or bypass Shaka's ownership. Prefer tests and narrow adapters inside an existing source/remux/image owner.

## D65: explicit Ogg stream selection

Smallest next gate: create a maintained source object for the two-stream fixture, request the second logical stream, and verify its complete sample identity through the actual chosen decoder. Check whether existing FFmpeg/demux ownership already provides a cheaper correct selection. Basic single-stream Ogg FLAC already works and needs no unwrap-only adapter.

Retain all source page bytes, granules, sequence numbers, and packet continuations for the selected stream. Bind selection to source identity and codec capability; reject mixing requests and unknown serials. Source mapping, cancellation, pending range reads, stale callbacks, and exact media-element audio output after seeks are new gates. Do not equate whole-file AudioContext exactness with exact physical output. Measure full source scanning/CRC/hash, preparation, retained original bytes, Blob creation, decoder setup, and playback before claiming benefit.

## D66: stable lane ID under exact compatibility

Smallest next gate: locate a real consumer whose compatible fragments actually change source-local track IDs. Compare (1) fresh initialization per transition and (2) guarded metadata remapping, without replacing the media element. The current working fresh-init route is the required baseline. Audit what the actual demux/mux/Shaka owner already does before adding a rewrite.

Never suppress semantic seek/reset/generation clearing under R069. Preserve separate source identity even when a decoder configuration is byte-identical. Reject incompatible sample entries, timescales, trex defaults, encryption, multi-track structures, or missing random-access/configuration requirements until separately qualified. Add a delayed old-source fragment whose track ID and configuration happen to match: the owner must reject it before publication. A stable lane ID is not proof of source correctness.

The tested constructor is a restricted proof-of-concept, not a complete MP4 validator. Preserve the exact original media payload, PTS, DTS and sample durations. Qualify A/V/subtitle continuity separately. No benchmark is justified merely by counting initialization appends.

## D67: source-proven WebP reset points

Smallest next gate: integrate the parser/frame views into a bounded image-seek owner for the binary-alpha, lossless, no-profile, transparent-background fixture. Compare its output against the authored oracle and an independent native/image reference at arbitrary targets. Existing R322 checkpoint evidence is a separate useful baseline, not a mechanism to duplicate blindly.

Only restart where the actual frame/disposal semantics prove a full-canvas reset. A full frame that will later be cleared has a different post-disposal state from its displayed state. Preserve blend and disposal flags and close every bitmap on cancellation/source replacement.

The current container parser does not prove binary alpha; the positive fixture is known by construction. Establish a reliable eligibility test or producer contract before automatic admission. Fractional-alpha output fails exactness and must remain excluded under an exact contract. Six standalone fractional patches also differ from their PNG browser reference; replacing the patch wrapper does not solve all composed outputs. Reopen only with an independently resolved output contract and causal tests, not an after-the-fact tolerance increase.

Before performance claims, charge source reading/indexing, every selected frame decode, composition, cleanup, and cache/retention state. Compare against the cheapest correct persistent decoder/checkpoint approach at the same memory budget. Source byte size or fewer cold image-decode calls is not a latency measurement.

## Running the package

Requirements: Python 3.13-compatible environment with numpy, Pillow with WebP support, and playwright; ffmpeg/ffprobe and /usr/bin/chromium available. No Internet is needed to run the tests. The browser tests use an in-memory page and Python-exposed fixture reads, not a loopback server or downloaded application.

```sh
python3 scripts/reproduce.py
```

Use a copy of the package to preserve original evidence. On a fresh folder, copy scripts/ and create fixtures/ and evidence/, or retain the package layout. The step runner also accepts half-open step indexes, for example `python3 scripts/reproduce.py 0 4`, then `4 7`, then `7 9`.

The initial single-stream destination probe is separately reproducible with `python3 scripts/probe.py` and is not included in the 95 main-screen fixture set. Read each failing record before interpreting a verification failure. Timing/callback counts are not guaranteed deterministic; compare media outputs and recorded scopes rather than expecting every raw JSON byte to match.

Code: MIT, with previously delivered helper code retained under the same license. Authored reports: CC-BY-4.0. All image/audio/video fixtures are procedural and contain no third-party media or font files.
