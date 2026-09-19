<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Audio bitstream component results

New strict page/lacing/CRC/continuation validation preserves all 103 packets in one-packet repagination, with truncated body and missing continuation rejected. New shortened-preroll crop has correct sample count but 4315 mismatches (max absolute float error 0.00774363), establishing that 83.6875ms is not a bit-exact guarantee for this fixture. Exact full-prefix crop and repagination host/browser outputs are reused, not rerun.

- No transport latency benchmark; 2646 bytes (12.9155%) page overhead in reused fixture
- No universal audible defect or universal minimum preroll duration inferred
- Full prefix is exact scope; shortened preroll is a meaningful negative control

Original output directory renamed after capture; replay with a new output directory. No production integration or performance claim.
