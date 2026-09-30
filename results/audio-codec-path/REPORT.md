# Audio codec versus output-path investigation

The published MP3 software result is real mpv software playback, not native fallback. Its ordinary output uses `web/audio-worklet.js` and `web/software-full-engine-worker.js`. Software AAC/FLAC use these same components. The MP3, AAC, FLAC and Opus fixtures are all 48 kHz stereo; sample-rate/layout differences do not explain the published gap.

The earlier MP3 mixed campaign already contains software windows at 3.39%, 2.71% and 9.45% whole-Chrome CPU. Renderer cost was 2.77%, 2.26% and 8.58%. Over those 20-second windows, worker pump ticks were 2912, 2956 and 2780 respectively, and there were zero additional rendered video frames. Thus the expensive window was not caused by a switch to video rendering or a several-fold increase in pump frequency. The later focused MP3 campaign stayed near 2.8%. These are observations of variability, not proof of its underlying OS/browser cause.

Selective playback differs from ordinary mpv output:
- `scripts/build-selective-audio.py` adds per-sample PTS/rate metadata to the native audio ring.
- `web/filter-retained-engine-worker.js` copies that metadata with the PCM, pumping nominally every 10 ms. Ordinary software pumps nominally every 5 ms, so selective does not simply have a faster producer timer.
- `web/selective-sync-worklet.js` scans new metadata and sends timeline messages every 1024 output frames (46.875 Hz at 48 kHz), plus rate boundaries. The ordinary worklet copies PCM without these timeline messages.
- `src/internal/native-mpv-audio.ts` maps these timestamps to the browser video clock, observes drift every 250 ms and keeps a video-frame callback for EOF. Ordinary mpv owns its own audio clock.

These code differences identify candidate integration overhead, not measured attribution to each operation. The earlier scheduled-buffer experiment shows that changing the selective output integration can reduce overhead; it does not show every AudioWorklet has a fixed 9% cost or that AC-3 decoding intrinsically requires 5%.

## Diagnostic probe

`tests/audio-codec-path-probe.mjs` runs software MP3, AAC and AC-3 audio-only through the same frozen runtime, one headed Chrome launch and fresh contexts. AC-3 is stream-copied from the HEVC10/AC3 source without transcoding. All streams are stereo 48 kHz. It checks nonzero PCM, consumed-frame progress, no new underruns, visibility/focus, route, process stability and errors. It is a short steady-playback mechanism probe, not a lifecycle qualification or a README refresh.

The first probe (`20260926-01`) accidentally omitted `startupGate:true`. It is retained and explicitly excluded from CPU conclusions; the original per-arm acceptance flags only checked playback/process stability. The corrected run (`20260926-02`) requires the completed startup hardware-key task before measurements. Exact source/runtime hashes are in `identity.json`.

## Corrected same-browser result

| Software audio-only source | Whole Chrome CPU | Renderer CPU | Consumed frames / 10 s | New underruns |
| --- | ---: | ---: | ---: | ---: |
| MP3 | 10.66% | 9.23% | 480,000 | 0 |
| AAC | 9.81% | 8.67% | 480,000 | 0 |
| AC3 | 9.87% | 8.85% | 480,000 | 0 |

All three diagnostic windows passed. Chrome startup readiness was confirmed complete and tracing stopped before measurement. Browser CPU was only 0.25-0.33%, so these totals are not the startup-browser-process artifact from the excluded run. All used the ordinary software/mpv PCM output, remained focused/visible, produced nonzero PCM and consumed 480,000 frames in approximately 10 seconds. AC-3 was no more expensive than AAC in this observation, and MP3 was slightly higher. One fixed-order window per codec does not establish a precise ranking.

The low 2.8% MP3 publication is not evidence of an inherently cheaper codec/output implementation: the same route can also cost roughly 10%. This probe establishes that the published inter-row gap cannot be treated as a stable codec-cost comparison. It does not determine the cause of the high/low browser renderer regime (for example scheduling or CPU power state), and none of those possibilities is established here. Non-Chrome activity was present on the machine; no host-load or CPU-frequency control was attempted.

The investigation therefore narrows the conclusion: AC-3 is not uniquely responsible for the large overhead; an ordinary mpv/AudioWorklet path can exhibit similar cost without selective synchronization or video. Existing selective output ablations remain evidence that the output integration can be improved, but claims of a universal fixed per-worklet overhead or a uniquely expensive AC-3 decoder are unsupported. Keep the README unchanged. No production files were modified and no builds were run.
