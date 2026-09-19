<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Paused/future audio cases pass. Queue and video-config cases fail because forcing duration6.0 is below AAC last-frame timestamp6.021333; this is a real duration policy error, preserved and corrected in the next run.

No gapless audio or frame-exactness claim. Prior split-tail coverage proves a different behavior and is retained only as a source reference.
