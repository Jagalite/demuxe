<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Installed WebKit26 exposes real ManagedMediaSource. Actual startstreaming/endstreaming events gate prepared-fragment production: initial production stops at33/90 fragments while playback continues; seek to75s resumes demand and advances beyond80s. Bufferedchange fires48times and149video frames observed. Declared full duration is required; first short-input and seek-clamping variants are retained. Removes Chrome-only environment block; no integrated remux, eviction-repair or exact A/V fidelity qualification.

Limits: Installed WebKit automation runtime, not Safari application/physical device matrix.; No independent pixel/audio or real remux performance qualification.; Fragment production simulates queued media preparation; no claim to saved encode/remux CPU.
