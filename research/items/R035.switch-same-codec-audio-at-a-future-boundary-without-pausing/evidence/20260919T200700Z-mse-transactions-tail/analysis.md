<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Same-codec AAC future T=2 replacement commits while playing near .5 s, retains old prefix and exact presentation objects, reaches EOF and observes 440-to-880 Hz change. Stale generation and invalid preparation leave old ranges untouched.

Next: Run lossless FLAC digital marker oracle and reject any boundary gap/repeat; current AAC frequency samples do not establish sample-exact non-pausing splice.

No full correctness or performance acceptance. See shared runs for immutable positive and negative variants.
