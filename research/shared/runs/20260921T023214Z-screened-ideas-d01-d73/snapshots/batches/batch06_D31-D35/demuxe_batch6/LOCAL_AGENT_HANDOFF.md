# Local-agent handoff — focused batch 6, D31–D35

Read `REPORT.md` and `evidence/verification.json` before using these results. Baseline: `Jagalite/demuxe` commit `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. This package is standalone: no Demuxe tests were executed and no repository change was made. D-labels are temporary; do not allocate new R-numbers or overwrite an existing item's scoped verdict without reconciliation.

## General workflow

1. Reconcile the latest code against this pinned context and trace the actual production owner. Stop if an equivalent correct route already exists or the proposed consumer has no relevant workload.
2. Use these smallest fixtures and independent comparisons before building a large subsystem. Preserve all negative cases and boundary discrepancies.
3. Keep component correctness, destination behavior, lifecycle, full requested semantics, and performance as separate gates. A positive API probe, decoder success, packet hash or EOF alone is insufficient.
4. Do not benchmark until a real opportunity and equivalent complete work are declared. Charge setup, parsing, buffering, copying, transformation, decode, retention, synchronization and cleanup. No percentages in this batch are performance evidence.

## D31: adaptive Opus grouping — extend R203, do not duplicate it

**Established:** Actual single-frame 2.5 ms packets regroup with the first 32 left unchanged; packet count 856 → 135; split-back exact; host and browser whole-file PCM exact. Browser MSE has seek/EOF/signal evidence.

**Retained gap:** MSE end is 2.1405 s unbatched and 2.141 s grouped, although complete PCM lasts 2.137 s. The exact streaming tail is not qualified. Do not infer streaming correctness from decodeAudioData.

**Next:** Audit packet timestamps, final durations, CodecDelay, DiscardPadding and the WebM timecode scale. Prove the clock map in integer units. Timecode quantization is only a hypothesis at this stage. Find an actual per-packet submission/mux owner before assuming fewer codec packets reduce JavaScript calls. Measure arrival-to-availability using the user's latency budget: grouping can add 17.5 ms to early frames within steady-state groups. First 32 coded packets have no grouping wait.

**Avoid:** A new all-format packet grouping engine; claims that Ogg is smaller than the original (it is not); changing modes across a group; implying random-access points were added.

**Run:** `python scripts/opus_group.py`; `python scripts/run_browser.py decode`; `python scripts/run_browser.py opuslife`.

## D32: finite AU/G.711 → WAVE

**Established:** Original finite AU rejected; header-only WAVE construction keeps companded bytes; host/manual integer output exact; browser whole-file output equals browser PCM-WAVE reference; native direct lifecycle and non-silent audio pass. Both laws cover all 256 symbols.

**Next:** Trace whether Demuxe already handles finite AU through this destination. Broaden only to actual consumer requirements: channel/rate boundaries, valid annotations, odd payload length, malformed byte counts, remote seek behavior and source replacement. No general AU conversion, RTP assembly or unbounded WAVE resource was tested.

**Fidelity:** A strict `integer / 32768` float contract differs from the tested browser endpoint for some positive samples. Preserve that distinction instead of silently changing the output policy. The known integer decode remains exact.

**Avoid:** Treating IMA/MS ADPCM as covered (both failed the destination probe), or adding an MSE streaming adapter for the four tested unsupported MIME strings. Do not advertise this finite audio result as complete A/V native support.

**Run:** `python scripts/probe_audio.py`; `python scripts/au_wrap.py`; `python scripts/run_browser.py decode`; `python scripts/run_browser.py aulife`.

## D33: exact MP4 edits — keep the failed candidate failed

**Established:** Tail-moov mono MP4 edits preserve original mdat and media addresses; single edit has the correct decoded prefix but too long a browser whole-file tail; two-part edits fail the join and output length for AAC and FLAC. Host edited decoding also fails its own source-slice oracle, sometimes differently.

**Next only with a material new mechanism:** A new destination, qualified sample trimming or complete authored sample-map approach. The present negative does not complete/reject R109's distinct video range-map work. Direct elements advertise intended duration and reach EOF, but their exact output was not measured; do not generalize decodeAudioData's counts to a physical playback diagnosis.

**Avoid:** Treating declared durations, packet identities or successful seeks as proof of edited output. Do not simply repeat the current tests until a different result appears.

**Run:** `python scripts/edit_view.py`; `python scripts/run_browser.py decode`; `python scripts/run_browser.py editlife`.

## D34: JPEG-origin JXL — advance R146's actual missing artifact

**Established:** Actual host libjxl 0.11.1 encoder generates reversible JPEG-origin JXL; decoder reconstructs original JPEG bytes exactly for baseline/progressive/grayscale/orientation+ICC fixtures. Browser JXL fails; browser reconstructed JPEG equals original JPEG. No reconstruction metadata, truncation and small output buffer reject.

**Next:** Build and expose only the needed reconstruction API in a browser/Wasm artifact with explicit version and symbols. Verify the artifact itself, not only library source availability. Re-run exact JPEG hash, browser pixels, wrong/missing reconstruction data, truncation, cancellation/source replacement and bounded output. The supplied host ctypes wrapper is not a Wasm implementation.

**Then:** Compare total startup/reconstruction/intermediate JPEG retention/browser decode with full software JXL decode. Internal libjxl allocation limits need separate instrumentation; the output-buffer cap is not a total-memory limit.

**Avoid:** General JXL→JPEG lossless claims for sources not reversibly encoded from JPEG; claims of zero decoding work; assuming a desktop library is already compiled into the production Wasm module.

**Run:** `python scripts/jxl_bridge.py`; `python scripts/run_browser.py images`.

## D35: exact sample-window scheduling — finite/decoded-buffer alternative

**Established:** At matching 48 kHz, native AudioBufferSource scheduling references one shared source AudioBuffer and renders exact single/two-part edits for browser-decoded AAC and FLAC. Every sample matches; +1-sample origins fail. Integer/range/same-rate guards reject unsupported plans. Standard API operation, not a new codec invention.

**Next:** Identify an existing decoded-preview/edit consumer. Test live controller pause/replay/cancellation/source replacement and exact output ownership; establish required A/V sync separately. For longer input, derive a bounded source-chunk strategy with explicit codec preroll and exact chunk boundaries before claiming streaming scalability.

**Costs:** Full source decode and 410,304 bytes of logical source PCM in the small fixture, plus output/engine allocations. Shared JS object identity is not zero-copy proof. Keep direct compressed playback preferred when it already meets the same requested semantics.

**Run:** `python scripts/run_browser.py schedule`.

## Package verification

`python scripts/run_all.py` regenerates all fixtures and results, and then calls `scripts/verify.py`. Dependencies are documented in the report. The shipped consistency suite has 105 passing checks, many checking expected failures. Do not copy that number into a count of research wins. Preserve stage-specific observations and hashes in any repository import.
