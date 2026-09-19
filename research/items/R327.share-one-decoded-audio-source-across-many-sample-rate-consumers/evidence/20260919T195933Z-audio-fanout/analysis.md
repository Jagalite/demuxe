<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Audio stage reconciliation

A real host FLAC decoder feeds bounded PCM queues to three persistent resamplers. Outputs at 32000/44100/48000 Hz exactly match independent decode paths (64000/88200/96000 stereo frames). Actual fanout backpressures; slow rejection and epoch tests are separate policy components, not integration proof.

Next: Exercise actual consumer cancellation/source replacement under one owned browser PCM broker, then benchmark equivalent independent persistent decoders including all queues and copies.

This is research evidence; production behavior and release qualification are unchanged. Original definitions and historical records remain intact.
