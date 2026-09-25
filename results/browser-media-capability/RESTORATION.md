# Native runtime-discovery restoration

Removed the native-direct `unqueriedAudio` veto and the preflight codec-name lookup/DTS-profile enumeration. Exact inspected codec strings and source-derived AAC object types still feed browser queries; definite negative answers still reject the corresponding route. Unknown input proceeds to runtime verification. Container MIME serialization, output packaging constraints and existing selective/experimental qualification boundaries remain; this is not blanket admission of every engine route.

Added ready-state decoded-audio-counter rejection alongside the existing Firefox audio-presence rejection. Merely removing preflight exclusions exposed silent native candidates that could stall play or reach EOF before fallback. The new check uses runtime output evidence rather than codec names.

Validation:
- TypeScript compilation passed; generated files were restamped using the existing license policy.
- 39 focused capability, selection, plan-admission and runtime-failure contracts passed.
- 32 Chrome/Firefox browser scenarios covered. `run-2026-09-25T17-58-43.840Z/result.json` has 31 passes and one obsolete harness assertion: Firefox PCM24 was expected to stay Native merely because preflight was eligible. The corrected assertion requires runtime-failure evidence before fallback. `run-2026-09-25T17-59-30.563Z/result.json` passes that PCM24 case, including audio output and pause/resume.
- Chrome PCM24 chose native-direct: observed open 103 ms and play verification 53 ms. These are descriptive single-run timings, not a matched startup comparison.
- Firefox PCM24 correctly fell back to Hybrid after runtime failure.
- Earlier failing attempts remain in adjacent run directories.
- Full `npm run build` reached the license check and failed on the existing unrelated `experiments/chrome-browser-cpu/diagnose.mjs` missing/incorrect SPDX header. That file was not modified.

Query clarification: local Chrome 153.0.8010.53 returned `probably` for `video/x-matroska; codecs="avc1.64000d,1"`, while rejecting PCM spellings `pcm_s24le`, `pcm`, `ipcm`, and `lpcm`. Thus the earlier claim that a complete query could not be formed was too strong. Query-syntax conversion differs from hardcoded browser-support policy; an unknown conversion must not veto playback.

Chromium's query parser and token registry are in `media/base/mime_util_internal.cc`; profile parsers are in `media/base/video_codec_string_parsers.cc`. Consult source/spec syntax rather than assuming FFmpeg names are accepted codec strings. Source tables are not a runtime enumeration API or a portable device-support guarantee.
