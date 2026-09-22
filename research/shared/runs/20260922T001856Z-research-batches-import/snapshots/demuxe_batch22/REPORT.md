<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 22, D86–D88

## Scope and result

Three bounded questions were executed with Chromium 144.0.7559.96 and FFmpeg 7.1.5. D86 and D87 share a fixture and compare different delivery constructions; they are not independent codec discoveries. Repository lineage was read at `3bfeac8178bd34047e5396d1618e09a31cf8618a`. No maintained Demuxe player, Shaka owner, production source reader, or compiled Wasm engine was executed or modified.

**D87 is the strongest positive:** separate audio/video SourceBuffers in one MediaSource/media element consumed partial long fragments before their tails arrived. The single-buffer grouped and interleaved counterparts remained blocked. **D86 is a negative for this new interleaving construction, not a reversal of R033. D88 is a conditional ownership experiment:** removing actual duplicate append requests is feasible, but a naïve deduplication cache can silently restore the wrong presentation.

No CPU, energy, total process memory, hardware acceleration, network latency, or production performance gain is established. The 500 ms tail hold is an authored availability test, not a transport benchmark.

## D86 — Does packet-preserving intra-fragment interleaving unblock early A/V?

### Why this is a different screen

R033 already records failed FFmpeg `frag_interleave` settings with AAC packet/tail problems. This experiment does not retry those options. A small independent Python constructor reads the actual source track/run tables, keeps every coded sample, and constructs explicit run metadata and relative data offsets. Its grouped and quarter-second-interleaved forms use the same source, codec configurations, timeline, and decoded output.

The synthetic source is a 192×112, 25 fps AVC presentation with B pictures and closed one-second GOPs, plus 48 kHz stereo AAC. Left and right contain distinct 503 Hz and 941 Hz tone patterns. It contains **75 video packets and 142 AAC packets**. The complete original asset is **116,757 bytes**.

| Construction | Runs | `moof` bytes | Fragment bytes |
|---|---:|---:|---:|
| Grouped tracks | 2 | 3,624 | 116,803 |
| Quarter-second interleaving | 25 | 4,084 | 117,263 |

The interleaved constructor therefore adds 460 metadata bytes relative to the explicit grouped constructor. Both are larger than the original optimized FFmpeg header layout.

### Independent checks

All 217 packet payloads, PTS, DTS, and sizes are unchanged after ordering records by track. A separate re-read of the actual `tfhd`/`trun` fields confirms every sample duration, flag, and composition offset. Independent FFmpeg decoding reproduces **2,419,200 raw YUV bytes** (75 complete pictures) and **1,163,264 Float32 audio bytes** exactly, within the host endpoint.

The browser whole-file decoder produces **145,023 stereo sample frames**, or **290,046 scalar values**, identically for the source and both reconstructed presentations. Its count differs from the host decoder's count. This screen preserves each endpoint's source output; it does not newly qualify original AAC encoder priming or tails against the pre-encoding signal.

One diagnostic remains explicit: FFprobe omits the first AAC packet duration in the original/grouped layouts and reports 1,024 ticks for it in the interleaved layout. Its underlying box duration is 1,024 in all variants. Accordingly, the complete FFprobe JSON records are not identical. This difference was investigated rather than erased from the evidence.

### Partial delivery result

Each single-buffer variant received initialization plus **32,971 fragment bytes**, then its remainder after an authored 500 ms pause. The interleaved prefix includes complete early packets from both tracks.

**Both stayed at time zero, with no buffered range, no changing video output, and no audio signal before the tail.** Both became playable after the remainder, reached EOF, matched seven seek-picture/timestamp checks, and retained the source's reported 3.021333-second duration.

Thus correct packet preservation did not make this particular interleaving layout useful for early joint A/V. The experiment has not isolated the browser's internal reason. Do not claim all interleaving is ineffective, or that this is a browser defect.

**Disposition:** stop this construction as an early-A/V optimization on the tested endpoint; retain it as a packet-correct negative and R033 follow-up.

Evidence: `evidence/manifest.json`, `evidence/browser_av.json`, `evidence/browser_whole_audio.json`, `evidence/analysis.json`.

## D87 — Independent parser inputs, one native playback clock

### Construction

The same packets are put in two long, single-track fragments: AVC in one, AAC in the other. Each track initialization is a projection of the original initialization. Both SourceBuffers are declared before appending initialization data. **One MediaSource and one video element still own the combined presentation.** This is not two media elements with an application synchronization loop.

Both fragments still describe their complete roughly three-second track. They are not cut into shorter media segments. Only a prefix of each is first supplied:

| Track | Complete samples in head | Head fragment bytes |
|---|---:|---:|
| AVC | 19 | 16,852 |
| AAC | 36 | 15,691 |
| Combined | 55 | **32,543** |

The two initializations add **1,501 bytes**, for **34,044 bytes** supplied before the remaining tails. This is a browser-submission count: the harness already read and indexed the whole source. It does not prove an equivalent network saving. A real producer must actually make both prefixes available, for example from prepared demuxed packets or qualified range access.

### Result and controls

Before either tail arrived, the media element advanced to approximately **0.501333 seconds**, with buffered coverage `[0, 0.76]`. The original run observed 13 pre-tail video callbacks and the replay 14. Every captured picture having a reference timestamp matched the full-input browser output; all seven final seek checks matched exactly. Tone witnesses independently detected both requested channel frequencies. Both tails appended successfully, playback reached EOF, and backward seeks remained correct.

The fully delivered single-buffer and split-buffer presentations also agree on the checked pixels, timestamps, and overall duration. Independent host decoding of each split track matches the corresponding original track.

A decisive control declares both SourceBuffers but withholds the initial AAC bytes. It can expose a paused video picture, but **time does not advance and no audio is observed** before the audio is supplied. A first video picture is therefore not the joint-startup gate.

### Qualification boundary

The actual on-the-fly audio capture uses ScriptProcessor callbacks and performs concurrent picture readback. Those recordings are diagnostic, differ across runs, and do not support a sample-exact live-audio or A/V synchronization claim. The exact audio finding is the independent complete decode comparison; the live finding is correct tone identity and early activity. Physical audio output and scanout are not measured.

No general decoder admission or cost advantage follows automatically. This is a destination-level continuation of existing R032/R132 and D14 work. A maintained split-track producer may already achieve the behavior. Conversely, extra metadata, SourceBuffer operations, parsing, copying, and coordination can erase a benefit where the original path already starts promptly.

**Disposition:** pursue a real producer/consumer follow-up. First inspect the existing native-remux and Shaka owners; do not add a competing streaming subsystem. The next gate is actual incremental source delivery with complete audio capture, source replacement, cancellation, buffer quotas, and a matched whole-player baseline.

Evidence: `evidence/browser_av_split.json`, `evidence/analysis.json`, raw referenced `.rgba` / `.f32` files.

## D88 — Deduplicate append operations, not merely fragment bytes

### Hypothesis

When multiple requests for the same already-prepared fragment reach one append owner, join truly identical pending operations or suppress an already satisfied request. This could avoid repeated parsing/copying at the MSE boundary. An immutable prepared-file cache, such as R018, does not itself establish that the file is currently installed at the requested native timeline location.

The prototype accepts host-validated immutable fixture handles; it does not implement a browser hashing, network-validation, or persistent-cache system. Its restricted requests are complete, closed-GOP AVC fragments at known presentation intervals. Its key includes source/init identity, current generation, coded bytes, timestamp mapping, mode, and window. It tracks pending operation order, known content mutations, current native ranges, and abort outcomes.

### Actual duplicate workload

Three one-second video fragments were each requested twice while the first request was pending, then once after completion. This is **nine intentionally duplicate requests**, not a measured production workload.

| Owner | Requests | Actual media appends | Compressed bytes submitted |
|---|---:|---:|---:|
| Serialized, no suppression | 9 | 9 | 179,793 |
| Corrected conditional guard | 9 | **3** | **59,931** |

Three requests joined pending work; three were already satisfied. The same seven output pictures/timestamps, retained range `[0,3]`, EOF, and cleanup passed. This is a reduction in operations and submitted bytes, **not a CPU, memory, or performance gate**. Hashing, metadata, queue management, range checks, and invalidation may cost more than they save in practice.

### Cases that must still append

1. **Repeat the same fragment at a new timestamp.** A byte-only cache skipped it and left `[0,1]` plus `[2,3]`, so the requested middle seek failed. The corrected owner kept both appearances.
2. **Restore evicted data.** A byte-only cache skipped refill and left `[1,3]`. The corrected owner checked retention and refilled the missing first GOP.
3. **Abort an append.** An actual `abort()` must not become a committed cache hit merely because an `updateend` event follows. The rejected operation was retried successfully.
4. **Reset the generation.** The explicit generation-clear test reinstalled all needed fragments. It is not a test of arbitrary late callbacks from a new source.

### Two more dangerous false successes

The first version of the ledger already used a content/mapping key and checked buffered coverage. It still failed:

- **A→B→A replacement at the same interval:** B replaced a previously installed A. Coverage remained continuous, so the cache wrongly skipped restoring A. Playback reached EOF with **two of seven requested pictures wrong**.
- **Pending A→B→A:** the last request joined the first still-pending A even though B was queued between them. The final result retained B, reached EOF normally, and had **three of seven requested pictures wrong**.

Both are real browser executions. Their raw observations and `browser_ledger_v0.py` remain in the package. The corrected prototype invalidates conflicting installed-content records before mutation, does not satisfy an old hit across pending conflicting work, and restricts pending coalescing by queue order. Both repaired cases execute five necessary appends and match the independent five-append reference.

**Disposition:** conditional, primarily an ownership regression. Do not integrate an additional ledger until the maintained append owner demonstrates a meaningful duplicate rate. Automatic browser eviction, arbitrary overlapping edits, partial fragments, concurrent consumer cancellation, and cross-codec configurations need separate contracts; retaining the existing conservative behavior is preferable to a false skip.

Evidence: `evidence/browser_ledger.json`, `evidence/browser_ledger_v0.json`, `evidence/verification.json`.

## Replay, corrections, and reproducibility

The original and clean-directory staged replay each pass **92 consistency assertions**. Several assertions deliberately confirm candidate failures; these are not 92 independent experiments or three release qualifications. All **27 fixture files** reproduce byte for byte. All corresponding seek-picture hashes and timestamps reproduce. Whole-file browser PCM also reproduces exactly.

Natural video callback counts vary by one in several variants. Live audio captures do not reproduce byte for byte. Those differences remain recorded and are not interpreted as physical smoothness or exact-audio evidence.

The initial packet-summary comparison and verifier diagnostic are preserved. The verifier initially required the first-AAC reporting discrepancy in both constructions; inspection showed it only occurs for interleaving. Its assertion was corrected without changing the signal-preservation requirement. The first long ledger invocation ended at an execution limit before the final scenario; that scenario subsequently ran, and the clean replay completed the full matrix. Session-style container execution was unavailable; replay was run in explicit stages, not as unobserved background work.

See `evidence/replay_summary.json`, `evidence/replay_fixture_hashes.json`, `evidence/CORRECTIONS.md`, and the retained `replay/evidence/` tree. To repeat independently, use:

```sh
python3 scripts/reproduce.py --out /absolute/path/to/new-output-directory
```

The output directory must not already exist. The script uses installed Chromium, FFmpeg/FFprobe, NumPy, and Playwright and does not download dependencies or modify a repository.

## Primary references and research lineage

- W3C ISO BMFF byte-stream format: https://www.w3.org/TR/mse-byte-stream-format-isobmff/ — relative fragment addressing, initialization and media segment requirements.
- W3C Media Source Extensions: https://www.w3.org/TR/media-source-2/ — one MediaSource with multiple track buffers, append state, timestamp mapping, removal and abort semantics. Implementation results are not inferred from the standard.
- `research/items/R033.interleave-samples-for-earlier-complete-a-v-output/README.md` at the pinned commit — preserve the existing failed interleave profile.
- `research/items/R032.use-different-output-containers-for-different-tracks/README.md` — existing split-lane capability and its qualification limits.
- `research/items/R132.incremental-mdat-sample-release.report-continuity/README.md` — lineage from prior reviewed video-only incremental sample release, not re-executed maintained work here.
- `research/items/R018.cache-prepared-media-by-timeline-and-transformation-recipe/README.md` — prepared artifact caching is distinct from current presentation residency.
