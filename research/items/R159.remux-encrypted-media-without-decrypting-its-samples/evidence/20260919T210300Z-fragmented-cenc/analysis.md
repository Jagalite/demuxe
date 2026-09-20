<!-- SPDX-License-Identifier: CC-BY-4.0 -->

New ciphertext-preserving single-track one-fragment CENC constructor. All24 host-decoded frames exact, wrong-IV negative detected. MSE selects CENC decryption and decodes frames/seek/EOF, but canvas-readback assertion fails on protected black output.

Contributes to 20260919T211500Z-cenc-acceptance. Captured raw outcomes unchanged.
