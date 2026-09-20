<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode directly at reduced resolution for explicit previews

Implemented an explicit reduced-detail preview admission policy and actual installed decoder lowres experiment. Runtime libavcodec reports max_lowres3 for MJPEG and MPEG2,0 for H264/HEVC/AV1; controls reject lowres when intent is ordinary playback or codec is unsupported. Twelve720p MJPEG frames decoded at lowres2 produce320x180 RGBA with the expected frame count. Against full decode plus area scaling, the independently declared30dB per-frame RGB preview threshold fails on11 of12 frames: PSNR falls from30.28 to28.60dB, max channel difference201 and520347 differing channel values. Preserve this intentional-approximation quality failure; no threshold relaxation, browser qualification or performance timing follows. This is no longer a missing preview-policy/tool setup blocker, and does not reject all possible explicitly different preview profiles. MPEG2 capability was queried, not experimentally qualified.

Next: Reopen only with a separately specified preview quality/scale profile or a corrected reconstruction/filter design meeting the existing30dB every-frame threshold. Ordinary playback remains full decode; no permission inferred from canvas size.
