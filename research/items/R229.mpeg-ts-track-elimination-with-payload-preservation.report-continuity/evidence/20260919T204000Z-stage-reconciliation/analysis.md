<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Historical evidence reviewed and hashed; no experiment rerun.

Correctness: passed. Program202 selector preserves packet timing/payload under reversedPATorder, rewrites validCRC and rejects missingprogram. Complete hostpixels/PCM exact; maintainedRemuxPlayer plays/seeks/cleans workers. DynamicPSI/scrambling excluded.

Performance: pending. No equivalent-work transport/preparation cost benchmark.

Prior finding remains scoped: Explicit program202 TS packet filter keeps selected elementary/PCR/PMT PIDs and rewrites PAT with valid CRC. Reversed PAT order produces identical selected payload/timing. Unchanged RemuxPlayer plays/seeks output, complete host decoded pixels/PCM exact. Missing program rejects; dynamic PSI/scrambled transport outside scope.

Production integration and release qualification remain separate.
