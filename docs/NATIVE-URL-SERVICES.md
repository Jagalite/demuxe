<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native URL services: implementation and validation

This change removes the File-versus-URL routing gap for inspected finite file
sources. It does not change README CPU results or claim a measured improvement.
The initial implementation ran no builds, tests or benchmarks while another agent
was performance testing. After testing was authorized, the build and 109 contract
tests passed. Follow-up HEVC timestamp repair brings the URL browser matrix to
12/12 passing, with both local-File HEVC controls and three focused C/packaging
regressions passing. See the [validation report](../results/native-url-services/validation/REPORT.md).
HEVC open-GOP seek startup now seeds decode timestamps below the earliest PTS
in a bounded reorder window, preserving packets and the discontinuity guard.
Changes are isolated in `/Volumes/seed2/Projects/demuxe-native-url-fix`.

- Native video plus mpv audio accepts inspected file URLs. The video remuxer and
  audio reader receive the same source identity, credentials, origin restrictions
  and authorization callback. Only video packets are remuxed.
- Native subtitle services accept the same URLs. URL subtitles require controlled
  remux for browser A/V rather than an uncontrolled direct media-element request.
  Subtitle I/O uses the existing RangeReader with a 4 MiB cache. Authorization
  replies bypass the subtitle RPC queue to avoid waiting behind their own read.
- The combined Native video, mpv audio and mpv subtitle plan uses these same
  transports. Audio retains stereo output; this does not qualify discrete surround.
- Manifests, explicit demuxer overrides, uninspected sources, unavailable assets,
  rejected video configurations and unsupported presentation features retain
  existing admission rules. Runtime output verification and compatibility fallback
  remain in place. Source identity, authorization and transport failures do not
  become codec fallback.
- AVC/HEVC parameter-set equality ignores trailing zero padding around Annex B
  NAL units. Actual parameter-set byte changes still reject preparation. The saved
  MPEG-TS row failed at this equality check; inspecting its bytes found one repeated
  SPS/PPS pair. Whether padding normalization resolves its entire remux lifecycle
  remains a runtime validation question.

## Validation commands

TypeScript and the remux runtime have now been rebuilt in this worktree. Materialize the sparse worktree's build/server inputs
and provide existing fixtures; do not substitute unrelated benchmark assets.

Then run:

```sh
node --test tests/native-url-services-contracts.mjs tests/remux-parameter-sets.mjs
node tests/native-url-services.mjs
```

`FIXTURE_ROOT` may point to the frozen row fixture directory. The browser check
uses the existing server and fixture bytes; it creates no fixtures and takes no
CPU measurements. It covers AC-3/E-AC-3/DTS and HEVC audio splits, text/bitmap
subtitles, combined services, the H.264/AAC TS route, authorization refresh, seeks,
rate changes, worker cleanup and terminal identity failure. After forward and
backward seeks, it checks screenshot color markers, observed 440/880 Hz stereo
output, and caption presence/absence. Text captions require the authored phrase
plus visible canvas pixels; ASS/bitmap captions require the screenshot's magenta
drawing. Text is inspected through the subtitle service, not OCR, so this does
not establish glyph-by-glyph fidelity. The contracts also cover typed selective
ownership failures and preservation of terminal transport, cancellation and
autoplay errors. These checks have now run; the linked report retains passes and failures. Existing local selective-audio/subtitle lifecycle and
transport suites must also pass before merging. Full marked video/audio/subtitle
correctness qualification and matched CPU remeasurement remain separate gates.

## Integration into local main

The merge preserves main commit `700e543b` and its HEVC random-access RASL
suppression and metadata guards. The lookahead seeds timestamps without changing
packets; the existing packet-processing path then applies that suppression.
Parameter-set padding normalization runs after NAL classification.
The earlier browser evidence is for the isolated branch, before this integration;
the merged runtime needs rebuilding and browser validation before CPU retesting.
