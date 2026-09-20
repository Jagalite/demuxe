<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Schedule H.264 deblocking as a dependency graph

Disposition: **stop_current_profile**. correctness: **passed**, performance: **failed**.

Actual pinned FFmpeg Wasm decoder instrumented without changing external sources/libraries. Real single-slice64x64 H264 intra fixture has120luma normal/intra deblocking calls. Independent skip-filter decode supplies unfiltered plane; optimized filtered Wasm matches host FFmpeg exactly. Original-order kernel replay and conservatively conflict-ordered45wave DAG replay both match all4096luma samples; reverse-order falsifier differs1188 and deblocking changes3413. Three decoder owners close and fresh owner exact. Actual WebGPU integer normal/intra filters translated from retained LGPL FFmpeg execute45ordered compute waves, at most4independent edges/wave; every output in10jobs of30frames exactly matches independent host/optimized decoder. Submitted stale generation result discarded; next fresh device yields30exactframes. All517buffers and11devices destroyed. Nine alternating30frame componentjobs: optimized CPUkernel 4.1894ms vsGPU 74.7744ms, saving-1684.83% CI[-1797.4251257315184, -1563.7647869245704]; first CPU14.570ms/GPU86.940ms. Predeclared lower95>=10%benefit fails decisively. Device/pipeline/edgeupload/planeupload/45dispatches/readback/fullcompare charged; GPUdestruction occurs after timing sample, further cost cannot rescue this negative. Common decoding/tracing and initialized Wasm module excluded: no full-decoder throughput claim. PaddedCPU byteplane vsGPU widened32bit16384Bplane,4320Bedge arrays (120 edges x 9 signed32 fields) and16384Breadback; transfer/storage explicit. Stop current tinyCPU-resident single-frame luma profile; no chroma, reference-frame pipeline, multi-slice, MBAFF or residentGPUdecoder claim. Retained startup diagnostics include EM_JS argument parsing, DSP initialization, consumed adapter and a nonexecuted syntax snapshot; no output threshold was relaxed.

Next: Reopen only with a materially different GPU-resident reconstruction owner or larger representative exact profile that changes transfer/45wave cost; preserve independent full output and wrong-order falsifier. Do not integrate this much slower CPU-resident component.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](../../shared/runs/20260920T005721Z-h264-edge-callback-parameter/analysis.md)

Accounting erratum: original run prose said5400B edge arrays; actual120x9x4=4320B. Original immutable evidence retained.
