<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserved development findings and scope

The first unpublished CAVLC writer incorrectly indexed sparse residual vectors by
absolute block index and treated packed 15-value AC arrays as 16-value arrays
with a leading DC slot. It panicked before output publication. Correct indexing
consumes packed coded-block vectors, keeps AC values 0..14, and updates neighbor
counts at actual block positions. Every successful run checks all parsed quantized
syntax and independent FFmpeg pictures, so these writer corrections are verified.

The first fixture-count assertion assumed unique RBSP bytes for every frame. The
static 18-frame stream has 17 unique source RBSPs, so source-bound sidecars are
legitimately reused. The harness now asserts a fresh-process restore event for
every frame, plus a valid unique record count, not 18 distinct hashes.

V1 passed all half-slice checkpoints but a later additional boundary-95 test found
a real restore validation bug: BitReader required byte_pos < data.len() even when
byte_pos == data.len() and bit_pos == 0 is legal with enough CABAC arithmetic
state to finish the final macroblock. The original failed trace is retained in
boundary-v1-failure.log; qualification/ contains v1 numerical results and binary
identity. The final guard permits precisely that exhausted, byte-aligned cursor.
qualification-v2/ and the fully rebuilt clean-replay/ qualify the corrected
prototype and preserve all new measurements rather than replacing v1 numbers.

The experiments used four generated profiles (78 pictures, 4,896 macroblocks,
117,746 nonzero coefficients), not arbitrary AVC files. I/P reference dependencies
are exercised by independently decoding full translated streams; source pictures
and required prefix syntax are retained. Entropy restart does not claim to skip
pixel reconstruction of already parsed prefix macroblocks or to supply a standalone
picture DPB capsule. Those complete-picture costs remain in the measured job.
The source SPS remains Main-profile: CAVLC output alone does not prove playback on
Baseline-only hardware or an increased Demuxe tier. No production route changed.

The R120 cost comparator performs exact-picture lossless decode/reencode to CAVLC,
then independently decodes it, versus syntax translation then decode. Reencoding
is not a coefficient-preserving baseline; the stronger coefficient-preservation
contract is separately checked on the candidate itself. If an input already plays
without conversion, passthrough is cheaper and no benefit is claimed. Native small
jobs were tested; browser loading, broad content coverage and physical energy were
not assessed. Cold checkout/build setup is measured separately in clean-replay;
it is not charged as per-playback compilation because the prototype is prebuilt.
