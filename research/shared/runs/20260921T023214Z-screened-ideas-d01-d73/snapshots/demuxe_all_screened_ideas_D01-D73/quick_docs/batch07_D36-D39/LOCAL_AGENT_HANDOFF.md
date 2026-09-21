# Local-agent handoff — D36–D39

## Read first

Read `REPORT.md`, `evidence/verification.json` and `ITEMS.json`. This package contains standalone component experiments, not Demuxe implementation changes. Reference repository commit: `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. Do not assign conflicting R-numbers, rewrite prior dispositions from these summaries, or claim a production/performance gate passed.

D36 and D37 share a fixture/author. D39 RGB is a separate input profile, not a patch for D39 YUV. The package does not test audio or A/V synchronization.

## Reproduce

Requirements: Python with NumPy, Pillow with AVIF support for the alpha-negative fixture, Playwright, Chromium at `/usr/bin/chromium`, FFmpeg/FFprobe with libx264 and libaom-av1. Recorded versions are in `evidence/environment_probe.json`. Chromium must support the tested media formats; do not assume another install behaves the same.

```
python scripts/run_all.py
```

Individual commands:

```
python scripts/edited_view.py
python scripts/ordered_build.py
python scripts/avif_route.py
python scripts/avif_rgb_followup.py
python scripts/run_browser.py views
python scripts/run_browser.py ordered
python scripts/run_browser.py avif
python scripts/run_browser.py avif_rgb
python scripts/analyze_verify.py
```

Original experiment records should be retained before a new run. The scripts regenerate fixtures/evidence in place. A checksum inventory identifies the delivered bytes; regenerate it after intentionally changing artifacts.

## D36 — Smallest next useful gate

Owner: finite edited-source construction and native source delivery, nearest R109.

The author actually parses source sample tables and authors new output tables. The browser only assembles their manifest into Blob slices. It does not run the author/parser inside Demuxe.

Port the bounded single-track, no-CTTS, constant-cadence, equal-description, IDR-closed interval profile into the actual source owner. Run a real native virtual-URL/range-serving endpoint in a permitted environment. Match random and boundary ranges against the exact materialized bytes before playback. Check source-validator changes, authorization, suffix/invalid range behavior, concurrent reads, cancellation and source replacement.

Do not treat the Python range function as a complete HTTP server or existing consumer-side RangeReader as proof this work is done. Browser loopback navigation was blocked during this batch. Do not work around browser administrative policy; qualify on an appropriately authorized normal development environment.

Stop on non-IDR starts, unsupported sample tables, mismatched configuration, changed identity, unexplained picture/timing difference or unbounded retention. Hashing complete sources on every read is a prototype validation cost, not a recommended hot path. Compare the current working route rather than a hypothetical full transcode baseline.

## D37 — Smallest next useful gate

Owner: only an explicit repeated-asset or export feature, nearest R120.

The variant reuses physical packet offsets in `stco`; it is not the earlier repeated-edit-list variant. Sample/timeline count remains 60; physical packet spans fall from 60 to 40. File bytes fall 51,344 → 34,337.

Test real native HTTP range behavior and caching for a backwards source-address jump; compare multiple browsers with ordinary payload layout and repeated edit-list layout. Count transferred bytes separately from file size. Decode/presentation work is not reduced by this construction. Do not promote it for ordinary looping on the strength of byte savings alone.

## D38 — Smallest next useful gate

Owner: maintained seek planner plus real source verification and append owner, adjacent to R188.

Use whole verified, independently decodable fragments, never reorder dependent packets inside a fragment. Preserve authored composition/decode timestamps. The test uses B pictures, [0.1, 4.1] presentation coverage and a target at 3.225 s whose picture time is 3.2 s.

Route one actual seek to initialization plus the target GOP before earlier GOPs. Verify that the maintained code does not unnecessarily serialize earlier ranges. Then backfill and seek backward while keeping the correct source generation. Test audio timing, eviction, overlap, failed reads, corrupted references and cancellation; none is already qualified by this video-only destination screen.

Retain `mode="sequence"` as an intentionally wrong presentation control: its video plays to EOF but all ten correct-timeline comparisons fail. Preserve the wrong-tfdt control. Retained JavaScript objects are not proof of a retained internal hardware decoder.

## D39 — Smallest next useful gate

Owner: explicit timed-image source, nearest R089.

The parser admits only one av01 item and one local extent, a defined property set and one sequence OBU plus one frame OBU. It reads primary identity and associations rather than blindly extracting the first packet. Unknown transforms, grids, alpha, auxiliary metadata and unfamiliar properties must remain rejected until separately supported.

Start with the actual RGB/sRGB subgroup (`rgb*.avif`). All three coded packets and complete host GBR match, and all six browser frame-hold observations match image-decoder RGBA in both direct and MSE playback. Check runtime profile support; no hardware/efficiency claim follows.

Keep the YUV subgroup as a **failed exact-presentation control**, despite unchanged packets, identical host YUV, successful seeking and EOF. Record its actual color metadata (2/2/1 limited) rather than inferring tags from FFmpeg arguments. Do not replace its source with re-encoded RGB and call that a lossless compatibility patch.

The proper next experiment is color/chroma/presentation attribution with independent references, or a larger unchanged RGB subgroup corpus. Do not silently apply guessed color labels. Do not assume native image decode is more expensive than native video decode.

## Promotion rules

A successful playback event is not sufficient. Require the selected pictures, timeline, requested components and declared output boundary. A host decoder and the browser are different oracles and may disagree.

Only after maintained correctness should a separate benchmark compare equivalent requested work: setup, input reads, validation, indexing, retained data, byte assembly, remux/mux, decoding and presentation. Do not use this package's script timings, payload counts, omitted prefix delivery, or 33.12% asset-byte reduction as a CPU/energy improvement.

## Explicit missing coverage

No maintained Demuxe execution; no real browser HTTP virtual URL; no TypeScript port; no A/V/subtitle/HDR checks; no multi-browser or physical display tests; no browser-internal allocation or hardware-decoder proof; no performance gates. D36/D37 frame output was checked by targeted seeks, not a guarantee of seamless real-time edited transitions. D38 has ten browser witnesses, not complete pixel hashing of all possible decode schedules. D39 uses two authored three-image groups, not a representative corpus.
