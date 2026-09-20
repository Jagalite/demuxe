<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Original-source comparison differs only in BGR0 unused byte3: lavfi sets255, FFV1 decode sets0, on all184320pixels. All meaningful B/G/R bytes already exact. BGR0 is not BGRA; canonicalize the unused byte to0 for an exact storage comparison and retain original source and failure details. No visiblepixel tolerance is relaxed.
