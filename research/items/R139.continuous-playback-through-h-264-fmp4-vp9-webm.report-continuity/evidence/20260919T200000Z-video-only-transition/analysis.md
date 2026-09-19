<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual Chrome H264/fMP4 to VP9/WebM video-only transition reaches EOF, renders both expected colors, seeks backward and forward across codec boundary and cleans up. Invalid MIME rejects. Preserved extra-audio-track variant fails append as expected for track contract mismatch. Existing exact A/V transition evidence reconciled, not rerun.

Color observation and cross-boundary seek pass, but numbered-frame exactness and failed-append rollback ownership are not yet established.

Next: Run numbered/full-frame independent image oracle, failed second-init recovery with old ownership preserved, and integrated queue cancellation.

Preserved run outcome: passed bounded component.
