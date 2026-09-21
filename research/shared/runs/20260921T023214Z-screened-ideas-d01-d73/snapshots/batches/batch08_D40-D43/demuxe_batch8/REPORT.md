<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — Batch 8: D40–D43

## What was executed

Four audio-focused questions were tested with real authored media, standalone adapters, FFmpeg/libopus decoding, Chromium whole-file audio decoding, MediaSource playback, and OfflineAudioContext rendering. These are preliminary component screens, not executions of the maintained Demuxe player and not production qualification.

Repository review: `Jagalite/demuxe`, commit `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. The GitHub branch read still returned that commit. No repository writes were performed. Runtime identities are in [environment.json](evidence/environment.json): Chromium 144.0.7559.96, FFmpeg 7.1.5, and the installed libopus. WebCodecs was not exposed in the test page. MSE and Web Audio were available. The browser was headless on Linux; no physical-speaker, hardware-decoding, energy, CPU, peak-memory, or cross-browser claim is made.

“Exact” below identifies a specific comparison boundary. It does not mean lossy Opus is identical to its pre-encoding source, that MSE seeks were sample-exact, or that physical audio output was measured. Source PCM and fixtures are synthetic and reproducible. Byte and sample counts are measured; potential runtime savings are hypotheses.

| ID | Question | Recorded outcome | Disposition |
|---|---|---|---|
| D40 | Select complete independent Opus components without PCM reconstruction | Three selections preserve complete selected-channel output in host and browser; MSE lifecycle works | Pursue the restricted component selector, not automatic downmix |
| D41 | Compose Matroska unlacing with per-frame header restoration | Xiph and EBML source cases retain 108 packets and exact full PCM; normalized output works in MSE | Regression/composition follow-up; ordinary unlacing already exists |
| D42 | Treat each chained Ogg link as its own decode configuration and lifetime | Monolithic browser output is wrong after first link; split-native decode plus native scheduling is exact | Pursue bounded per-link adaptation; live integration remains |
| D43 | Make bounded browser-resampled chunks match continuous resampling | Aligned 24→48 kHz windows exact on three fixtures; both fractional-rate cases remain nonexact | Narrow empirical pursue; reject a general exactness claim |

## D40 — Select whole Opus elementary streams rather than reconstructing every channel

### Mechanism and novelty boundary

A multistream Opus packet contains independent mono or coupled stereo components. All but the final component use self-delimiting framing. A requested entire component can be repackaged as an ordinary mono or stereo stream while retaining its compressed frame bytes. This is not extraction of half a coupled stereo pair and not a downmix.

The existing repository item **R104.select-or-assemble-whole-opus-elementary-streams-without-pcm** was blocked on a real component parser/selector with truthful layout, pre-skip, and comparison controls. This prototype advances that bounded setup; it does not implement general mapping families or update the repo item.

`scripts/multistream.py` implements a restricted parser for code-0, one-frame, 20 ms packets. The authored six-channel mapping-family-1 fixture contains four elementary streams, two coupled. Its source mapping is explicitly checked. The selector preserves gain, pre-skip, final granule, and the selected component's configuration. Unsupported packet packing, half-pair selection, downmix requests, mismatched pre-skip, and truncated component lengths reject.

### Results

The six-channel Ogg source is **124,513 bytes**, with **108 packets**, **312 samples of pre-skip**, and **102,576 output frames per channel**.

| Explicit request | Output Ogg bytes | Output WebM bytes | Values compared per container | Result |
|---|---:|---:|---:|---|
| Original front left/right pair | 35,195 | 33,246 | 205,152 | Exact selected samples |
| Original center channel | 22,814 | 20,945 | 102,576 | Exact selected samples |
| Original rear left/right pair | 72,102 | 70,023 | 205,152 | Exact selected samples |

Host FFmpeg with explicit libopus decoding agrees sample-for-sample with the requested channels of its full-source decode. Chromium's Ogg and WebM whole-file outputs agree independently with the requested channels of its full-source decode. The adapter itself does not reconstruct PCM; host decoding is a test oracle.

The three WebM outputs play through MSE, complete seeks to 0.25 and 1.25 seconds, produce nonzero output on the expected number of captured channels, and reach EOF. That capture is not a complete sample alignment oracle. The MSE presentations report **2.161 seconds**, whereas the exact whole-file PCM is **2.137 seconds**. Exact MSE tail and seek semantics therefore remain unqualified.

The wrong-component comparison fails. The three byte counts are selection-specific, not universal compression ratios and not CPU improvements. Full six-channel browser decoding already works here; this is an explicit-operation optimization opportunity, not a missing-decoder fix.

Evidence: [host/component](evidence/multistream_component.json), [browser exact output](evidence/browser_multi.json), [MSE lifecycle](evidence/browser_multilife.json).

### Next gate

Check the maintained selected-output contract and caller first. Extend packet packing only with independent length/duration controls, then integrate one explicit pair or center selection. Compare against full six-channel native decode plus the already available channel-selection graph, including parser/copy/mux/destination cost. Do not discard surround channels for an ordinary stereo-downmix request.

## D41 — Restore stripped headers after unlacing, not once per block

### Mechanism and existing implementation

Matroska lacing stores multiple codec frames in a block. Header stripping removes the same leading bytes from each frame, storing those bytes in track metadata. The composition needs to identify frame boundaries, restore the prefix to each frame, and carry timing and trimming into the destination representation.

**R110.choose-a-destination-aware-lacing-or-unlacing-representation** already records maintained Wasm normalization of Xiph-laced Opus. No new generic unlacing subsystem is justified by this batch. The added screen covers **header stripping composed with Xiph/EBML lacing**, explicit validation, and a laced-tail boundary. R358's recorded zlib/unlaced profile is another related but different scope.

The authored source has 108 stereo 20 ms Opus packets, a shared `fc` prefix, fixed packet duration, CodecDelay, SeekPreRoll, and an exact final discard amount. The bounded adapter supports only the specified track/configuration, one header-stripping encoding with scope 1/order 0/type 0, finite validated elements, and bounded laces. It rejects malformed lengths, other compression algorithms, changed source identity, and unsupported structure.

### Main positive fixture: padded final packet is not laced

| Source grouping | Source bytes | Normalized bytes | Coded packets and full decoded output |
|---|---:|---:|---|
| Xiph + header stripping | 32,748 | 34,095 | 108 packets exact; 102,576 stereo frames exact |
| EBML + header stripping | 32,722 | 34,095 | 108 packets exact; 102,576 stereo frames exact |

The main source deliberately leaves the final padded packet unlaced. This isolates the adapter from the separately tested laced-tail interpretation problem below.

Source and normalized output match the original packet reference and complete host PCM. Chromium whole-file decoding of both original and normalized cases also matches all **205,152 scalar samples**. MSE rejects the original laced presentations; normalized output plays, completes two seeks, emits both channels, and reaches EOF. A plain uncompressed Xiph-laced WebM also fails MSE, so lacing alone is already an observed destination obstacle.

The original compressed Matroska **already works via native-direct Blob playback** and reports 2.137 seconds. This is a controlled-MSE composition/regression opportunity, not proof that a normally playable file needs a new route. The deliberately simple output gets larger because it uses individual packet blocks/clusters.

Normalized MSE reports **2.16 seconds**, so exact streaming tail behavior is not qualified despite exact whole-file PCM. A broken adapter that restores the prefix only to one packet in each group produces incorrect/shorter whole-file output and a real MSE decode failure.

### Separate boundary: padding on a four-packet lace

An additional source puts four final packets in one block and attaches **792 samples' worth of end padding** to that block. The author includes the required BlockDuration and uses the Block flag layout rather than the SimpleBlock layout.

FFprobe exposes `discard_padding: 792` on **each of the four packets**. Host decode consequently returns **100,200 instead of 102,576 frames**, a difference of **2,376 frames**. The specification describes padding on the block, not a new independent full padding amount on every lace member. This observation merits targeted demuxer/adapter investigation; do not infer that every real-world laced file has this problem.

An initial setup omitted BlockDuration and used a SimpleBlock flag in the BlockGroup. Those setup results are archived in `evidence/initial_lacing_setup/` and are **not qualification evidence**. Adding the correct metadata and flag layout did not remove the boundary observation. The current valid main fixture isolates the padded packet; `laced_tail.mka` preserves the separate boundary and `laced_tail_packets.json` records the four side-data entries.

Evidence: [component](evidence/lacing_component.json), [browser exact output](evidence/browser_lacing.json), [MSE](evidence/browser_lacinglife.json), [native direct](evidence/browser_lacingdirect.json), [padding diagnostic](evidence/laced_tail_packets.json).

### Next gate

Run these fixtures through the maintained adapter before writing new production code. Preserve the already implemented Xiph behavior. Add composition and EBML coverage, and investigate padding ownership at the actual demuxer boundary. Do not silently “correct” a source by following whichever endpoint happens to decode it first; state the intended packet/timeline contract.

## D42 — Chained audio needs independent configuration, trimming, and decoder state

### Mechanism

A chained Ogg resource concatenates complete logical streams, not one perpetual codec instance with one global header. The parser walks actual pages, verifies their CRCs and sequence/continuation structure, and separates links only at valid BOS/EOS boundaries. Multiplexing, missing EOS, truncation, and reused stream serials reject within this profile. Each emitted link is an **unchanged byte slice**, including its own headers, pre-skip, gain, packets, and final granule.

This builds on D35's bounded native scheduling but adds a real container/link parser and independent decode lifetimes. A repository keyword search did not return a chained-stream item; that is not proof that no existing code handles it.

### Authored chain

| Link | Output frames/channel | Pre-skip | Header gain |
|---|---:|---:|---:|
| 1 | 50,003 | 312 | 0 dB |
| 2 | 37,001 | 120 | +3 dB |
| 3 | 68,009 | 312 | −6 dB |

Total: **155,013 stereo frames**, **3.2294375 seconds**, **81,593 source bytes**.

The browser's monolithic whole-file decode returned the correct total frame count but differed from independent-link output at **every subsequent sample in each channel after frame 50,003**: 105,010 mismatches per channel. The host monolithic libopus decode also diverged after the first link. The experiment changes gain and encoder delay across links; it does not fully isolate the contribution of every codec-state/configuration factor.

Native-direct playback reported **1.423354 seconds**. Requested seeks to 1.7 and 2.5 seconds were clamped to that value. The element reached EOF, which does not make this a correct complete-chain presentation.

Each parsed link decodes exactly like its standalone source. The candidate decodes the extracted `splitN.opus` files independently, then schedules three AudioBufferSourceNodes at integer-sample boundaries in OfflineAudioContext. All **310,026 scalar output samples** match the independently concatenated link reference. A deliberate one-sample scheduling shift fails. Flattening all packets under the first header produces the wrong samples and **157,128 frames**, rather than 155,013.

The candidate retains **1,240,104 bytes of source Float32 sample storage**, before output and other allocations. This is not compressed-only playback, live streaming, or a proof of lower peak memory. The demonstrated benefit is correctness while retaining browser-owned decoding/scheduling, not a measured CPU reduction.

Evidence: [component and index](evidence/chain_component.json), [browser decode and scheduling](evidence/browser_chain.json), [native-direct limitation](evidence/browser_chainlife.json).

### Next gate

Integrate a bounded per-link owner with cancellation and source identity. Use actual link boundaries rather than blindly concatenating compressed packets. Test seek into a later link, changed channel layout, live scheduling across boundaries, and eventual A/V synchronization. Benchmark only against an already-correct chain reference.

## D43 — Bounded native resampling needs more than a nominal rate ratio

### Mechanism and test boundary

The actual browser `decodeAudioData` endpoint resamples decoded PCM to the context rate. This screen supplies finite Float32 WAVE windows, compares independently converted windows against the same endpoint's complete-source conversion, and checks every output sample. It is not a mathematical toy and does not claim to execute Demuxe's maintained resampler. The existing **R233.make-independently-resampled-audio-chunks-join-exactly** remains subject to its maintained-consumer/state-interface gate.

Each source is partitioned into six irregular output intervals. Candidate windows include neighboring source samples (“halo”), align to the rational source/output phase grid, and trim the converted window to its exact absolute-output interval. Additional control variants omit the overlap or phase alignment. A follow-up also aligns the source-window start to a multiple of 32 source samples compatible with the rational phase grid.

### Results and refinement

Initial overlap/phase variants all failed bit-exact equality. The stricter alignment follow-up produced:

| Rate conversion | Output samples | Differing samples | Largest absolute Float32 difference | Exact? |
|---|---:|---:|---:|---|
| 24,000 → 48,000, primary fixture | 100,006 | 0 | 0 | Yes |
| 24,000 → 48,000, noise/silence/step fixture 1 | 58,034 | 0 | 0 | Yes |
| 24,000 → 48,000, noise/silence/step fixture 2 | 131,074 | 0 | 0 | Yes |
| 44,100 → 48,000 | 119,748 | 427 | 9.313225746e-10 | No |
| 48,000 → 44,100 | 91,892 | 483 | 1.490116119e-8 | No |

The three 24→48 kHz results cover **289,114 exact output samples in 18 independent jobs**. Unaligned/overlap-free controls fail, and full-source repeat decodes match exactly in every tested case. This distinguishes the observed window effect from nondeterministic complete-source reference output.

The 32-sample start alignment is an **empirical qualification condition for this endpoint/build**, not a Web Audio promise and not proof of a particular SIMD implementation. Kernel/state behavior and cross-browser stability have not been isolated. It is not justified to round the fractional-rate discrepancies down to “exact.” A separately authorized numerical-error contract would be a different research gate.

For the primary 24→48 kHz case, the largest input window is **12,470 source samples**, versus 50,003 samples in the complete source. Across all six windows it consumes **1,379 extra input frames** due to overlap/alignment. These are window/read counts, **not measured peak memory or CPU savings**: the harness deliberately retains the whole reference source. The 44.1→48 kHz stricter alignment consumes 17,396 extra input frames and does not pass exactness.

One naive downsampling variant fails output coverage before it can even compare the complete requested interval. That failure is retained. The chosen profile caps the input window and rejects fractional/reversed positions or oversized halos; it is not a general production conversion API.

Evidence: [primary variants](evidence/browser_resample.json), [additional 24 kHz fixtures](evidence/browser_resample_followup.json), [initial stage](evidence/browser_resample_initial.json).

### Next gate

Select a real consumer that already requires rate conversion. Repeat the narrowly successful rate/profile on other browser builds and architectures; audit the arithmetic/state reason for the empirical alignment. Compare a bounded context-pool implementation against a continuous converter, charging WAV construction, overlap reads, context creation, copies, and scheduling. Preserve a persistent converter or explicitly different error contract for fractional rates. Do not introduce resampling into an otherwise same-rate path.

## Evidence and reproduction

[verification.json](evidence/verification.json) contains **95 passing consistency checks**. Several checks intentionally require a candidate or endpoint to fail. These are not 95 discoveries, production passes, or independent performance experiments. The scientific outcomes remain distinct in that file.

Run `python scripts/run_all.py` from this package in an environment with the dependencies in `README.md`. Individual component and browser stages can also be run separately. Every external encoder/decoder command is logged in `evidence/commands.jsonl`. `SHA256SUMS.json` pins the delivered artifacts; rerunning fixture encoders may change container serials or metadata with other library versions. There is no automatic repository write or benchmark threshold hidden in the scripts.

## Primary-source references

- Opus self-delimiting component framing: [RFC 6716, Appendix B](https://www.rfc-editor.org/rfc/rfc6716.html#appendix-B).
- Opus-in-Ogg header, mappings, gain, pre-skip and end-granule semantics: [RFC 7845](https://www.rfc-editor.org/rfc/rfc7845.html).
- Ogg logical-stream chaining and page structure: [RFC 3533](https://www.rfc-editor.org/rfc/rfc3533.html).
- Matroska lacing: [specification notes](https://www.matroska.org/technical/notes.html).
- Matroska ContentEncodings, BlockDuration and DiscardPadding: [element specification](https://www.matroska.org/technical/elements.html).
- Native decoding/resampling and scheduling interfaces: [Web Audio API](https://www.w3.org/TR/webaudio/).

The specs describe mechanisms; they are not evidence that this browser satisfies a particular sample-level contract. The package records actual observations separately.
