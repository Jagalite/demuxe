<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Audio component results

Both AAC source-rate directions play expected tones and video, reach EOF, pause and seek backward with same audio/video SourceBuffers. Positive and negative offsets relocate tone windows; changing timestampOffset alone leaves accepted ranges unchanged. Paused remove/reappend updates to opposite offsets also produce expected tone and EOF.

- Component browser ownership, not maintained player controller integration
- Rate-switch PCM sample-exact boundaries and failed replacement recovery unqualified
- Offset negative-time prefix intentionally clipped; fixture prefix is silence
- Marker checks use intervals 200ms inside onset and 100ms inside end, not sample-exact timing
- Preserved failed aggregate observation mixed backward startup with forward observations; corrected phase-labelled run passes
- Preserved server-path failure is setup error, not media failure

Original command output directory was renamed after completion; substitute this run path for replay. No source/runtime files or historical evidence were changed.
