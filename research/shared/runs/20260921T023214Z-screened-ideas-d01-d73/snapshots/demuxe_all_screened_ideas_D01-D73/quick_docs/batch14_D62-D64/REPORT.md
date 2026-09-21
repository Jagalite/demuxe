<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 14 (D62–D64)

## Summary

Three new **bounded follow-up questions** were executed. D63 and D64 share one FLAC/MSE primitive and should not be counted as independent inventions. D62 extends subtitle object/state handling rather than inventing another subtitle codec.

| ID | Question | Actual observation | Scoped disposition |
|---|---|---|---|
| D62 | Can fragmented PGS objects be retained independently from their palette and presentation state, then rendered through native PNG decoding? | Six display sets, three decoded objects, five PNG assets; all 15 seek-indexed native compositions match an independent subtitle-bitmap reference. Wrong palette, epoch and clear policies fail. | Pursue restricted state/cache integration. Not a full PGS or cross-color-domain qualification. |
| D63 | Can MSE perform sample-exact FLAC clipping without re-encoding edge frames or materializing the desired clip as application PCM? | Three nontrivial sample windows, including a 128-frame clip, yield 157,944 exact captured channel values and correct signal lengths. | Pursue this codec/destination boundary. Playback reliability is not fully qualified. |
| D64 | Can independently encoded FLAC selections be queued in one MSE owner, including appending later selections while audio is playing? | A/B/A output contains all 148,018 intended channel values, exact across both joins, with one retained SourceBuffer. Prebuffered and live-append cases reproduce. | Pursue lossless-audio queue integration; do not generalize to lossy encoder boundaries. |

**Important replay qualification:** the initial verification was 92/92. The fresh-directory replay was **91/92** because its unmodified full-source baseline capture omitted 128 frames in the middle. All six positive clipping/queue candidates, their materialized reference clips/queue, the controls, and PGS picture outcomes reproduced. The anomalous baseline is not repaired or discarded. We have not isolated whether the loss was in media delivery, clock correction, capture scheduling, or another runtime component. See [replay summary](evidence/replay_summary.json) and [anomaly analysis](evidence/capture_anomaly.json).

## Execution and scope

Lineage was checked against `Jagalite/demuxe` commit `6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36`. No maintained player was executed and no repository changes were pushed. The environment is recorded in [environment.json](evidence/environment.json): Chromium 144, FFmpeg 7.1.5, Python/NumPy/Pillow/Playwright.

Browser-owned processing is not proof of hardware acceleration. No CPU, energy, startup, physical-memory, or whole-player benefit was measured. Test fixtures are deliberately small, deterministic and synthetic. They establish behavior of specific representations, not prevalence in ordinary media.

The scripts use actual browser MediaSource/SourceBuffer operations and natural-speed playback. Audio reaches an AudioContext at 48 kHz and is captured with ScriptProcessorNode before a downstream mute gain; it is **not** an OfflineAudioContext reconstruction. This is an instrumented software boundary, not physical speaker output. Main-thread capture can itself be a reliability risk; the retained replay anomaly makes further qualification mandatory.

Source integer audio is 24-bit, stereo, 48 kHz FLAC. FFmpeg stream-copy packaging into fragmented MP4 is a fixture/preparation step, with all compressed packet hashes checked. The candidate playback operations do not change those prepared packets or create a clipped PCM input. The analysis harness deliberately retains reference PCM and recorded output; its memory use is not the candidate's memory footprint.

## D62 — Retain PGS object data, not stale rendered subtitles

### Hypothesis and distinction from existing work

A subtitle object's run-length data, its current palette, its placement, and its source epoch have different lifetimes. A palette update or placement change should not require re-decoding the object's RLE; a clear or new epoch must not accidentally preserve old presentation state.

The current [R198](https://github.com/Jagalite/demuxe/blob/6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36/research/items/R198.bitmap-subtitles-directly-from-rle-runs/README.md) already has real binary PGS tests. Its strict FFmpeg-background-compositing comparison failed. This experiment **does not overturn that failure**. It declares a different boundary: exact independent **subtitle-only straight RGBA**, followed by the same browser's composition of candidate and reference over the same native video frame.

### Executed component

`pgs.py` parses a genuine 1,182-byte SUP stream with six display sets. It handles the authored first/continuation/last object segmentation and publishes a scene only after the END segment and all its dependencies are complete.

The fixture contains two simultaneous nonoverlapping objects, a palette-only update without new object data, a placement/removal change, a clear, and a new epoch reusing an earlier object ID and version with different bitmap content, followed by another clear. All three object definitions are split across multiple ODS packets.

The parser decodes each completed object into palette indices once. It creates a compressed PNG index stream once per object and reuses those IDAT bytes when only the palette changes. Native ImageBitmaps are keyed by complete content identity rather than only object ID/version. There are **three object decodes and five PNG assets (646 bytes in total)**. This small count is not a measured saving versus the maintained decoder, which may already retain related state.

### Independent references and results

FFmpeg's actual `pgssub` decoder renders the subtitle-only output to straight RGBA with timestamps. The candidate's six snapshots match every host RGBA component. The host output is not first burned into a YUV background.

The browser decodes candidate indexed PNGs and separately generated PNGs of the independent host snapshots. At 15 presentation-time queries, including backward queries and points before/after clear and epoch transitions, it composites both against the **same captured native video frame**. All 15 pixel comparisons match. Five candidate ImageBitmaps are created and closed; the same media source URL is retained and background playback reaches EOF.

These are seek-indexed rendering checks. They do not qualify autonomous real-time subtitle scheduling, worker cancellation, physical overlay planes, or the maintained HEVC/audio/PGS complete-file case.

### Decisive controls

* Cache keyed without palette identity: 5/15 picture checks fail.
* Cache keyed without epoch/content identity: 3/15 fail, despite reusing apparently valid IDs and versions.
* Keep the previous active scene through a clear: 3/15 fail, although video playback still reaches EOF.
* Missing ODS continuation, missing new-epoch object, a cold palette-only segment, truncated SUP, changed source bytes, a wrong source token, out-of-bounds RLE, and unqualified palette chroma are rejected.
* Starting from the second complete epoch produces the same object image as warm parsing. This is not random seeking from any arbitrary PGS packet.

### Exclusions and next gate

The accepted palette has neutral chroma, black/white luma and alpha 0/128/255. Canvas size is fixed at 128×64, at most two nonoverlapping displayed objects; crop/forced flags, general chroma, HDR, arbitrary window layouts and overlapping objects are not admitted. The parser checks source bytes against the supplied expected digest; that digest alone is not an authentication system.

Next inspect the maintained object/palette owner before adding a new parser. Reuse its existing state and test content/epoch-keyed cache invalidation, then qualify arbitrary palette color and the project's chosen compositing contract. Do not turn these same-browser results into a software-renderer equivalence claim.

Evidence: [PGS manifest](evidence/pgs_manifest.json), [browser results](evidence/browser_pgs.json), [host decoder log](evidence/pgs_host.log).

## D63 — Native clipping of lossless audio at individual sample boundaries

### Hypothesis

For a qualified lossless audio codec and native destination, coded-frame edge clipping may be expressible through MSE's timestamp offset and append window, even when the requested boundary is inside an encoded frame. This must be tested at actual PCM output, not inferred from buffered ranges or media duration.

This extends the destination scope of [R094](https://github.com/Jagalite/demuxe/blob/6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36/research/items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md), whose cited accepted profile is complete-prefix mono Ogg Opus through whole-file decoders. It does not generalize the failed video append-window trimming from earlier D30.

### Candidate and reference

The source contains 60,013 stereo sample frames, encoded into 59 FLAC packets with a nominal 1,024-sample frame size. A second independently encoded source is used only in D64.

The candidate appends the original initialization and original source fragments. For source interval `[a,b)`, it sets `timestampOffset = -a/48000`, `appendWindowStart = 0`, and `appendWindowEnd = (b-a)/48000`. No coded payload, packet duration, or source frame header is rewritten by the candidate.

The independently authored reference is the exact integer source slice, separately FLAC-encoded and presented through the same MSE capture path. It also agrees with the known `integer/8388608` Float32 sample values for these S24 fixtures.

| Source sample window | Requested stereo frames | Captured candidate frames | Individual values compared | Result |
|---|---:|---:|---:|---|
| `[1001,48037)` | 47,036 | 47,036 | 94,072 | Exact |
| `[8192,40000)` | 31,808 | 31,808 | 63,616 | Exact |
| `[15001,15129)` | 128 | 128 | 256 | Exact |

All three candidate recordings and their three independently encoded reference recordings reproduced in the fresh-directory run. Their total requested output is **157,944 exact channel values**.

### Capture accounting and controls

Every authored expected frame has a nonzero sample-identity witness. Analysis removes only one leading interval of capture silence and independently checks the last nonzero frame. It does not resynchronize within the requested interval, trim additional output, replace lost samples, or splice a passing result together.

A one-sample offset error preserves a plausible duration and EOF but changes all 94,072 compared channel values of the first clip. A one-sample-too-late end on the 128-frame clip preserves all requested values yet returns **129 frames**; its length oracle fails. These failures distinguish correct contents, correct length, and plausible playback status.

The browser reports endpoints with microsecond granularity, slightly below some exact sample-coordinate durations. This numerical TimeRanges representation is not a claim of exact wall-clock output timing. The observed PCM length is checked separately.

### Limits

The candidate still reads/appends all source fragments in the current prototype, including ones MSE discards outside the window. There is no source-I/O, memory, decoder-work or CPU saving established. The full-source baseline missed 128 recorded frames in the replay; output/capture robustness needs independent checking even though the clipping candidates reproduced. Seeks/replay inside the already clipped session, pause/resume, changing sample rate, surrounding filters, different FLAC layouts, lossy audio and A/V synchronization remain unqualified.

Evidence: [audio source manifest](evidence/audio_manifest.json), [initial browser captures](evidence/browser_audio_first.json), [additional clips](evidence/browser_audio_rest.json), [extra-tail control](evidence/browser_audio_controls.json), [sample analysis](evidence/analysis.json).

## D64 — Join independent FLAC selections without creating a new encoded bridge

### Hypothesis and relation to D63

If D63's clip bounds are correct, can those bounded selections be composed into a single native-owned timeline? This is a composition/lifecycle extension of D63, not another codec algorithm.

The explicit source plan is:

| Interval | Source | Source sample window | Frames | Destination window |
|---|---|---|---:|---|
| First | A | `[1001,31002)` | 30,001 | `[0,30001)` |
| Second | B | `[3007,28013)` | 25,006 | `[30001,55007)` |
| Third | A | `[40009,59011)` | 19,002 | `[55007,74009)` |

For each interval, the candidate sets its destination append window and an offset `(destination_start-source_start)/48000`, then submits unchanged prepared source fragments. It does not generate a combined audio buffer, crossfade, silence patch, or newly encoded boundary.

### Results

The separate materialized reference and all three candidate delivery variants produced exactly **74,009 stereo frames / 148,018 channel values**:

1. All intervals prepared before playback, with source-appropriate initialization at each transition.
2. The same scoped sources using only the first initialization.
3. Playback starts with only the first interval appended; the remaining intervals are appended after media time reaches approximately 0.15 seconds, before the first boundary at approximately 0.625 seconds.

Both joins, all prefixes and suffixes match the independent source-slice reference. There are no inserted zero frames in the authored output. The application retains the same MediaSource, SourceBuffer and media element. This says nothing about whether the browser internally reset or retained a hardware decoder.

The source-A/source-B codec profiles are identical S24 stereo 48 kHz. The single-initialization variant is not authorization to omit initialization across arbitrary codec or layout changes. AAC/Opus state and encoder priming are separate; this does not overturn [R036's AAC queue failure](https://github.com/Jagalite/demuxe/blob/6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36/research/items/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop/README.md).

### Control

Shifting only the second interval's source mapping by one sample leaves the first and third intervals exact, preserves total length and EOF, but changes **50,012 channel values** in the middle interval. The comparison uses one global capture alignment, so correct outer intervals cannot hide an incorrect join.

The live-append variant reproduces in the fresh-directory run. It supplies future data before the playback boundary; it is not a late-segment, underflow, network-jitter or deadline-stress result. Whole-session memory, backward queue seeks, cancellation of pending additions and physical output continuity remain next gates.

Evidence: [prebuffered variants](evidence/browser_audio_join.json), [live append and control](evidence/browser_audio_live.json), [isolated wrong-middle control](evidence/browser_audio_controls.json), [full comparisons](evidence/analysis.json).

## Reproducibility and retained anomaly

The fresh run regenerated **103 fixture files with identical hashes**. All PGS picture outcomes and 14 of the 15 globally aligned audio capture outcomes matched the original run. The single mismatch was an **unmodified full-source baseline**, not one of the clipping or queue candidates.

That recording preserves source frames `[0,24320)`, omits `[24320,24448)`, and then exactly matches the remaining source. Its recorded signal is 59,885 rather than 60,013 frames: 128 missing frames, approximately 2.667 ms. EOF, duration and buffered range did not expose the loss. No local sample insertion or second alignment is applied. This is a detected integrity problem in the instrumented playback/capture result; its cause is not isolated and it must not be blamed on a specific browser subsystem.

Initial verification: **92/92**. Fresh replay: **91/92**, with the baseline failure retained. The combined tool invocation reached its execution ceiling at the PGS stage; PGS and verification were then completed in another call. All tests completed; the replay was not fully green.

See [verification](evidence/verification.json), [replay verification](evidence/replay/verification.json), [anomaly](evidence/capture_anomaly.json), and [replay summary](evidence/replay_summary.json). A consistency assertion is not a discovery or a production gate.

## References and lineage

* [W3C Media Source Extensions](https://www.w3.org/TR/media-source-2/): append windows, timestamp offsets and coded-frame/splice processing. Specification support is not universal decoder qualification.
* [W3C PNG](https://www.w3.org/TR/png-3/): indexed-color palettes, transparency and IDAT.
* [FFmpeg PGS decoder source](https://ffmpeg.org/doxygen/trunk/pgssubdec_8c_source.html): independent object assembly, palette, epoch and output behavior.
* The three pinned repository items linked above provide lineage, not evidence that the maintained player executed these candidates.

No external photographic media, music, font files, or production binaries are bundled. See [provenance](FIXTURE-PROVENANCE.md) and [handoff](LOCAL_AGENT_HANDOFF.md).
