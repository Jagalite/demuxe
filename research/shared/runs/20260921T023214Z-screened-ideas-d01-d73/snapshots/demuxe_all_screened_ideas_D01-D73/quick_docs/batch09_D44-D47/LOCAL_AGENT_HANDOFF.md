# Local-agent handoff — D44–D47

Read `REPORT.md`, `evidence/analysis.json`, `evidence/verification.json`, and the raw browser results before updating any research status. Repository context was read at `015004be024fc04cb0234f523290b4c377870257`; the scripts are standalone, not changes to that tree. Keep these provisional D-labels until duplicate/lineage checking is complete. Do not overwrite historical R decisions.

## Recommended bounded follow-ups

**D44:** Trace the maintained direct-failure fallback and the exact multi-entry `stsd`/fragment-index path. Test the supplied unmodified source through that owner. The standalone MSE destination already handles it; do not add the single-description projection on this evidence alone. Add a whole-timeline capture and a real selected-audio track before widening the contract. Unknown description indexes and silently choosing entry 1 must remain decisive negatives.

**D45:** Preserve the empty-buffer native rejection. It does not disprove software recovery. Only reopen with a genuinely different endpoint or explicit native/software handoff and a real output/lifetime owner. Do not forge IDRs, discard prerequisites, or rerun the same tiny host benchmark to reverse R150's cost result. Immediate output from the first eight host pictures is wrong in this fixture.

**D46:** Locate the provenance of the actual source color declaration and every layer that propagates it. Where signals conflict, require an existing documented precedence or an explicit repair request. Port or reuse the necessary metadata operation; do not introduce a generic color converter. Check matrix, primaries, transfer and range together. Validate on actual destination builds; the observed bitstream precedence is not a browser-independent authority rule. The concrete rewrite tested here used host FFmpeg, not a maintained Wasm artifact.

**D47:** Select a real bounded preview/seek consumer, not normal sequential playback by default. Prototype packet-window construction from an already validated source-bound index, browser decode, explicit sample bounds and output lifetime. Cover the six source ranges and omitted-overlap negatives. Do not treat the browser AudioBuffer length as the authoritative end. Only then compare full request cost against direct native seeking, whole-source decode and a persistent software decoder, charging indexing, CRCs, copied headers, decode setup, output retention and scheduling. R223's stopped parallel-subprocess profile must stay distinct. Add cancellation, configuration invalidation, source replacement and memory accounting before adoption.

## Replay

Dependencies: captured FFmpeg 7.1.5, Chromium 144.0.7559.96, libVorbis 1.3.7; Python with NumPy and Playwright. The package does not install or launch privileged services. Run in a new copy to retain the delivered evidence.

```sh
python scripts/video_build.py
python scripts/color_followup.py
python scripts/run_video.py descriptions
python scripts/run_video.py refresh
python scripts/run_video.py colors
python scripts/run_video.py color_resolved
python scripts/vorbis_windows.py
python scripts/run_audio.py
python scripts/analyze.py
```

Or use `python scripts/run_all.py`.

Code roles: `video_build.py` authors bounded MP4/configuration fixtures and parses recovery messages; `color_followup.py` applies explicitly authorized metadata repairs; `vorbis_windows.py` validates Ogg and constructs packet-copy views; browser scripts execute the actual destination and output oracles. `analyze.py` verifies cross-record assertions, including expected failed candidates.

## Evidence rules

Report native browser-owned playback separately from hardware acceleration. Report sampled video hashes separately from complete timeline capture. Report host and browser PCM comparisons against each endpoint's own reference separately. Keep native cold-start failure, unchanged-MSE success, redundant projection, conflicting-color behavior and extra Vorbis tails as separate outcomes. No CPU, energy, whole-player or universal compatibility claims are authorized by this package.

If importing, preserve raw logs and item lineage; add one immutable run folder and new history entries rather than modifying historical evidence. The 79 passing assertions include detection of wrong output and rejection. They are not four successful production implementations.
