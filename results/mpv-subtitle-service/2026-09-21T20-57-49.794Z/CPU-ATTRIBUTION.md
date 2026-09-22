# Subtitle prototype CPU attribution

The earlier 50% summed browser CPU figure was not a measurement of subtitle cost. Its median candidate trial used 33.9% of one core in Chrome's main browser process, 7.7% across renderers, 7.9% in the GPU process, and 0.6% in audio. The non-main-browser portion was about 16.2%. GPU-process CPU is not GPU utilization.

## New controls

Three 12-second trials per arm after two-second warmup, headed Chrome, same authored HEVC Main10/AAC video. Direct MP4 was packet-copied from the MKV, without re-encoding. All playback trials maintained real time without process turnover or reported runtime playback errors. Blank is an idle page and intentionally has no media progress.

| Arm | Median total CPU | Median browser-main CPU | Median other-process CPU |
| --- | ---: | ---: | ---: |
| blank | 27.6% | 27.2% | 0.4% |
| candidate | 37.8% | 27.7% | 9.4% |
| direct | 35.3% | 28.7% | 6.9% |
| idle-subs | 35.2% | 27.6% | 7.1% |
| native | 34.7% | 28.0% | 8.3% |
| render-only | 40.2% | 29.6% | 10.5% |

Column medians are independent and need not sum exactly. `native` is incremental remux without subtitle service. `idle-subs` initializes the service but does not render during playback. `render-only` executes mpv rendering and tile conversion but suppresses full overlay bitmap creation, transfer and presentation. `candidate` is the complete subtitle prototype. `direct` plays the prepared MP4 through NativePlayer without remux. `blank` loads the harness page without any player.

The complete subtitle path adds about 3.1 percentage points relative to no-subtitle remux in this control series. Its renderer cost is only a few points higher. An idle page itself consumes about 27.6% total CPU in this environment. Thus most of the aggregate figure is not subtitle rendering. The reason Chrome's idle main process consumes this much CPU has not been profiled; do not assign it to a specific browser feature or automation mechanism.

Rendering-only totals are noisier and do not establish a reliable separate transfer/compositing cost. Direct and remux totals overlap; these short controls do not establish a precise remux overhead. Subtracting unrelated idle medians would not produce an exact isolated player cost.

## Comparability and limitations

The current generated NativePlayer and native-remux-player.js hashes differ from the original performance manifest. The original 50% result therefore cannot be compared directly with the current roughly 38% candidate result as an optimization improvement. The raw original process breakdown remains valid evidence of what its total included. No original data was rewritten, and the original 28.4% aggregate reduction is not a subtitle-specific or energy result.

The current fixture is small, local, no B frames, one-second GOPs, with modest ASS. These controls do not qualify the user's original MKV, Firefox, heavy ASS, production seeking, or hardware decode. Some final candidate/render-only snapshots retain one worker after the bounded wait; the browser is then closed. This is not lifecycle qualification. Missing-resource logs contain favicon requests. The first control launch failed because an optional diagnostic field was not initialized in the new native-only arm; that harness error is retained in 2026-09-21T20-54-32.992Z and excluded.

## Evidence

- ../2026-09-21T20-54-44.427Z/results.json: native / idle-subs / candidate controls.
- results.json: blank / direct / render-only controls.
- cpu-attribution.json: per-trial and median process breakdowns.
- original-cpu-breakdown.json: original raw measurements regrouped by process type.
- source/ and manifest.json: current laboratory sources and asset hashes.

The harness now supports these explicit control modes. No production playback code was changed for this investigation.
