<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode directly at reduced resolution for explicit previews

Completed the second codec explicitly requested by the source proposal: twelve progressive720p MPEG2 frames at decoder lowres2 versus full decode plus area-scale320x180. The same predeclared30dB every-frame RGB preview contract fails11 of12 frames,30.24→25.99dB, maximum channel difference224. The earlier MJPEG test also failed11 of12,30.28→28.60dB. Installed max_lowres is3 for both,0 for H264/HEVC/AV1; explicit-intent and unsupported-codec admission guards pass. These are actual reduced-detail quality failures, not unavailable adapters. No performance, reverse-preview or full-resolution restoration qualification follows a failed output contract. No quality tolerance was relaxed. Failure is scoped to this quarter-resolution preview profile, not every possible approximate-preview design.

Next: Reopen a materially different explicitly requested quality/scale profile or reconstruction satisfying the original30dB every-frame threshold, then complete reversal/restoration and timing. Do not use lowres for ordinary exact playback.
