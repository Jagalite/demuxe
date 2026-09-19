<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Multicore FFV1 without shared address-space state

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Prepared four independent FFV1 quadrant streams decoded by four separate host processes reconstruct 12 frames exactly. Swapped quadrants fail; preparation size recorded. Original-bitstream slice extraction and browser multicore route are not proven.

Correctness: **passed**. Performance: **pending**.

Four separate host FFV1 process outputs reconstruct all 12 full frames exactly; swapped quadrant control fails. Prepared compressed size increases 24351→28965 bytes. Accepted independently prepared quadrant component, not original-stream slice extraction or browser threads.

Next: Establish target browser/process transport and account preparation plus decode/assembly costs before claiming multicore value.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
