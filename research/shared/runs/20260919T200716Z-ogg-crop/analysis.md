<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Audio component results

Host and browser crop outputs match continuous source samples 12345:67890 exactly (55545 samples). Independent ffprobe confirms all 72 compressed packet SHA256 values unchanged. Wrong pre-skip control yields 67890 samples and fails the contract.

- All prefix audio packets retained; no minimal preroll or performance claim
- Chrome decodeAudioData destination; no streaming MSE/WebM/MP4, concatenation or physical output qualification

Original command output directory was renamed after completion; substitute this run path for replay. No source/runtime files or historical evidence were changed.
