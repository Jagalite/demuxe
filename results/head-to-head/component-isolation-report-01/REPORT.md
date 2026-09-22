<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Remaining Hybrid component study

Negative deltas mean lower CPU/RSS. Dashes mean no qualified paired measurement, never zero. All successful replacements are explicit lab routes; automatic routing is unchanged.

| Case | Exact blocker | Replacement trial | CPU delta | Summed RSS delta |
| --- | --- | --- | --- | --- |
| H.264 + PCM24 / MKV + external ASS | subtitles: Default external ASS ownership is mpv; the optional independent Native libass renderer needs explicit admission. | Pass (bounded fixture) | -35.7% | -5.7% |
| H.264 + AC-3 5.1 / MKV | audio: Selected AC-3 audio produces no Native decoded-audio progress; video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + E-AC-3 5.1 / MKV | audio: Selected E-AC-3 audio produces no Native decoded-audio progress; video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + DTS core 5.1 / MKV | audio: Selected DTS audio produces no Native decoded-audio progress; no DTS packet-copy mux contract exists. | FLAC adaptation requires an established mono/stereo layout and sample rate | — | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | audio: Selected AC-3 audio fails Native verification; HEVC video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | audio: Selected E-AC-3 audio fails Native verification; HEVC video is presented. | Audio codec is not qualified for lossless adaptation | — | — |
| HEVC Main 10-bit SDR + DTS core / MKV | audio: Selected DTS audio fails Native verification; HEVC video is presented; no DTS packet-copy mux contract exists. | Lossless FLAC requires established 16/24-bit integer precision; no quantization permitted | — | — |
| H.264 + AAC + embedded SRT / MKV | subtitles: Selected embedded SRT is not delivered by the admitted Native subtitle path; unchanged MKV A/V works. | Pass (bounded fixture) | -50.2% | -12.5% |
| H.264 + AAC + embedded mov_text / MP4 | subtitles: Selected embedded tx3g requires extraction; unchanged MP4 A/V works. Only text/timing equivalence is qualified. | Pass (bounded fixture) | -48.7% | -10.9% |
| H.264 + AAC + styled ASS / MKV | subtitles: Embedded ASS requires independent extraction and libass composition; unchanged MKV A/V works. | Pass (bounded fixture) | -36.8% | -6.0% |
| HEVC + AC-3 + PGS / MKV | subtitles + audio: PGS composition is not provided by Native; direct Native also presents video but fails AC-3 audio. Hybrid itself misses the authored drawing. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + AC-3 + VobSub / MKV | subtitles + audio: VobSub composition is not provided by Native; direct Native also presents video but fails AC-3 audio. | Audio codec is not qualified for lossless adaptation | — | — |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | audio + fidelity: E-AC-3 audio fails Native verification; HDR transfer/display fidelity remains independently unqualified. | Audio codec is not qualified for lossless adaptation | — | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | streaming / timing: Native has no admitted MPD segment/timeline owner. Finite MSE trial passes; Hybrid baseline times out on pause after marked A/V. | Pass (bounded fixture) | — | — |
| AV1 + Opus / DASH VOD (WebM segments) | streaming / timing: MPD segment/timeline ownership, not AV1/Opus decoding, excludes Native; finite MSE trial passes. | Pass (bounded fixture) | -55.7% | -8.2% |
| H.264 + AAC / HLS live (sliding window) | streaming / timing: Live manifest ownership is gated. Direct Native trial plays initially but stops advancing during the rate test. | Error: Playback-rate progression outside bounded tolerance | — | — |

## Component owners after successful substitution

| Case | Video owner | Audio owner | Subtitle owner | Demux / manifest owner | Presentation owner |
| --- | --- | --- | --- | --- | --- |
| H.264 + PCM24 / MKV + external ASS | browser media element | browser media element | independent libass | browser | browser media element + libass overlay |
| H.264 + AAC + embedded SRT / MKV | browser media element | browser media element | browser text track | browser A/V + bounded JS subtitle extraction | browser media element |
| H.264 + AAC + embedded mov_text / MP4 | browser media element | browser media element | browser text track | browser A/V + bounded JS subtitle extraction | browser media element |
| H.264 + AAC + styled ASS / MKV | browser media element | browser media element | independent libass | browser A/V + bounded JS subtitle extraction | browser media element + libass overlay |
| H.264 + AAC / DASH VOD (fMP4 segments) | browser media element | browser media element | none | browser segments + bounded JS MPD/MSE loader | browser media element |
| AV1 + Opus / DASH VOD (WebM segments) | browser media element | browser media element | none | browser segments + bounded JS MPD/MSE loader | browser media element |

## Raw paired measurements

CPU is percent of one core. RSS is MiB, summed across listed Chrome processes. Each row is one end-to-end player trial: startup, steady playback, seeks and EOF; it is not an uninterrupted full-file timing or a helper microbenchmark.

| Case | Pair | Variant | Startup wall ms | Startup CPU s | Steady CPU % | Peak summed RSS MiB |
| --- | --- | --- | --- | --- | --- | --- |
| pcm-ass | 1 | baseline | 2276.361 | 1.138 | 30.206 | 894.125 |
| pcm-ass | 1 | candidate | 1416.032 | 0.686 | 21.621 | 902.875 |
| pcm-ass | 2 | candidate | 1490.744 | 0.748 | 16.315 | 940.203 |
| pcm-ass | 2 | baseline | 1700.016 | 1.097 | 30.727 | 1041.453 |
| pcm-ass | 3 | baseline | 1588.478 | 1.046 | 29.157 | 1016.281 |
| pcm-ass | 3 | candidate | 1369.656 | 0.726 | 18.742 | 958.766 |
| h264-srt | 1 | baseline | 2449.041 | 1.046 | 29.935 | 935.406 |
| h264-srt | 1 | candidate | 1296.736 | 0.596 | 14.910 | 914.078 |
| h264-srt | 2 | candidate | 1280.508 | 0.613 | 14.977 | 897.359 |
| h264-srt | 2 | baseline | 1497.600 | 0.940 | 34.207 | 1025.031 |
| h264-srt | 3 | baseline | 1470.883 | 0.952 | 37.927 | 1027.266 |
| h264-srt | 3 | candidate | 1252.261 | 0.626 | 19.199 | 897.406 |
| h264-movtext | 1 | baseline | 1789.029 | 0.956 | 38.464 | 1013.328 |
| h264-movtext | 1 | candidate | 1277.837 | 0.651 | 19.715 | 902.453 |
| h264-movtext | 2 | candidate | 1266.473 | 0.557 | 19.338 | 904.438 |
| h264-movtext | 2 | baseline | 1497.282 | 0.918 | 41.815 | 1019.078 |
| h264-movtext | 3 | baseline | 1411.706 | 0.982 | 37.686 | 1005.078 |
| h264-movtext | 3 | candidate | 1270.495 | 0.648 | 20.375 | 900.453 |
| h264-ass | 1 | baseline | 1703.858 | 0.951 | 39.453 | 981.031 |
| h264-ass | 1 | candidate | 1411.299 | 0.561 | 15.544 | 848.781 |
| h264-ass | 2 | candidate | 1460.240 | 0.638 | 19.015 | 942.875 |
| h264-ass | 2 | baseline | 1625.288 | 0.881 | 29.119 | 968.375 |
| h264-ass | 3 | baseline | 1712.380 | 0.895 | 33.513 | 998.094 |
| h264-ass | 3 | candidate | 1305.953 | 0.651 | 21.169 | 938.422 |
| dash-av1 | 1 | baseline | 1729.233 | 0.853 | 37.220 | 941.359 |
| dash-av1 | 1 | candidate | 1183.816 | 0.517 | 16.507 | 894.625 |
| dash-av1 | 2 | candidate | 1159.923 | 0.513 | 15.618 | 888.750 |
| dash-av1 | 2 | baseline | 1382.852 | 0.858 | 31.995 | 968.641 |
| dash-av1 | 3 | baseline | 1621.810 | 0.914 | 31.482 | 977.391 |
| dash-av1 | 3 | candidate | 1163.137 | 0.491 | 12.949 | 885.203 |

Full per-pair differences for startup wall/CPU, steady CPU, summed RSS and main-thread work, plus raw seek costs, process samples, exposed copy/renderer counters and evidence paths are in [analysis.json](analysis.json) and the linked per-case performance records. Percentages are not combined across formats.
