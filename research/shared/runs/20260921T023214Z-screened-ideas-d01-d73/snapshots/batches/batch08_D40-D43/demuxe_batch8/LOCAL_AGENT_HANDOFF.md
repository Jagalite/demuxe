<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff — Batch 8 / D40–D43

## First actions

Read REPORT.md and evidence/verification.json. Verify SHA256SUMS.json before changing files. Inspect current Demuxe main and the full item identities below; this package reviewed `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1` but did not run maintained code. Keep these temporary D IDs until checking the catalogue for collisions. Add an immutable run, not an overwrite of historical reports or a blanket promotion of pending stages.

All candidate scripts are finite, deliberately restricted components. They are not hardened production parsers. Existing source identity, cancellation, size limits, requested-track semantics, and worker ownership must remain in force. Measurements here do not prove lower CPU, energy, or complete memory cost. Preserve all negative outcomes.

## D40 — Highest-priority bounded operation

Related item: `R104.select-or-assemble-whole-opus-elementary-streams-without-pcm`.

Read scripts/multistream.py and the host/browser exact-output records. Integrate only an explicitly requested whole stereo pair or independent mono component. The code handles this exact six-channel mapping and code-0 20 ms frames, not arbitrary Opus packet packing or mappings. Keep the half-coupled-pair and downmix rejection.

First local gate: run the source, three selected outputs, and controls through current Demuxe; compare every selected-channel sample to the correct full-source endpoint, including gain and pre-skip. Then exercise selection changes, cancellation and source replacement. The three outputs reached MSE EOF but reported 2.161 seconds for 2.137 seconds of whole-file PCM. Do not mark streaming-tail/seek fidelity passed.

Compare any performance candidate against correct full six-channel native decode plus an explicitly requested native channel-selection graph, not against gratuitous software decoding. Charge parsing, copying, repackaging, destination overhead and the actual operation's workload.

## D41 — Add regression/composition coverage before writing a subsystem

Related items: `R110.choose-a-destination-aware-lacing-or-unlacing-representation` (already implemented); `R358.unwrap-matroska-track-compression-before-choosing-a-decoder` (different zlib/unlaced scope).

Run stripped_xiph.mka and stripped_ebml.mka through the maintained path first. Its generic demuxer may already handle both. The new evidence is per-frame header restoration combined with two lace encodings and trim ownership, not rediscovery of ordinary unlacing. Original native-direct already works. All positive source/reference PCM here is exact only with the final padded packet left unlaced.

Investigate laced_tail.mka independently: FFprobe repeats a 792-sample discard on each of four final packets and host output is 2,376 frames too short. Use the source-defined block contract, verify the fixture's exact structure, and trace the actual demuxer before patching. The initial setup archive omitted a required duration and used the wrong block flag layout; it is explicitly nonqualifying. The final boundary reproducer corrects both.

Normalized MSE reports 2.16 seconds for 2.137 seconds of PCM. Preserve that unresolved boundary. Do not replace a working cheaper native-direct route just to demonstrate MSE. Include the wrong_restore.webm control: restoring a prefix to only one packet is not an acceptable approximation.

## D42 — Keep links separate until a correct consumer can join them

No chain-specific item was found by one repository keyword search; inspect current code/catalogue rather than assuming novelty. D35 already covered native scheduling; this adds a concrete logical-link parser and source-derived independent configuration lifetimes.

Read chain.py: each emitted link is an exact source slice after real page CRC, serial, sequence, continuation and BOS/EOS checks. The 3-link source has distinct pre-skips and gains. Browser whole-file decoding reports the right sample count but wrong samples after link 1; direct playback reports the wrong duration and clamps later seeks.

First local gate: source-bound index plus decode each complete link independently; compare all samples and offsets. Then test seeking into links, change of channel layout, cancellation while a previous link decodes, and bounded live scheduling. Current scheduler is OfflineAudioContext only and retains 1,240,104 bytes of source PCM plus output/other allocations. It is not a seamless live player or a compressed-only path.

Do not concatenate all compressed packets under the first OpusHead. Keep wrong_flatten.opus and the one-sample-wrong schedule as decisive negatives. The combination of gains, pre-skips and state changes was not fully factored; do not claim a single root cause without additional controls.

## D43 — Conditional resampling component, not a general exact adapter

Related item: `R233.make-independently-resampled-audio-chunks-join-exactly`.

The test exercises actual browser decodeAudioData resampling on Float32 WAVE windows. The stricter rational/32-source-sample alignment plus 128-sample overlap passes 24→48 kHz on three fixtures. It still fails exactness in both 44.1/48 kHz directions. Keep all fractional-rate failures and the naive output-coverage failure.

First select a real existing rate-conversion consumer. Repeat current comparisons on the deployment browser/architecture before integrating. Determine whether the empirical alignment depends on kernel arithmetic, implementation layout, or another state detail. The API does not promise bit-exact resampling across independent calls.

For a performance gate, use a bounded context pool and charge native context creation, Float32/WAVE wrapping, overlapping inputs, retained buffers, repeated conversion and output scheduling. The test harness retains the full source/reference and does not measure memory savings. Do not introduce rate conversion where the requested same-rate source already plays correctly.

## Files and commands

`python scripts/run_all.py` regenerates fixtures and runs the current bounded screen. Chromium defaults to `/usr/bin/chromium`; set CHROMIUM for another executable. Read README.md for dependencies. Individual script stages are listed in run_all.py. Native versions affect expected observations; a new result should be recorded under a new immutable run rather than edited to match this report.

Qualification order: detect whether current code already implements the useful behavior; preserve requested output; exercise ownership/cancellation and adverse cases; only then run equivalent-work resource measurements. Do not sum byte reductions or infer CPU savings from packet/sample counters.
