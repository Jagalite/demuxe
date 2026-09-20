<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Initial native loadeddata rendering did not yield the requested alpha picture (alpha error255). Use the existing correctness harness first-picture timestamp plus 80ms seek before drawing; include that selection cost in the native owner task. Output thresholds unchanged; both methods still request reference frame zero.
