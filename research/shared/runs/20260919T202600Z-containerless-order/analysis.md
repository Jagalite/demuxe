<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Independent review corrected the VP9/Opus construction order: creating both SourceBuffers before any appendEncodedChunks allows actual green video/882.9Hz audio, seek to0.8s, EOF and cleanup in explicitly flagged Chrome152. Previous quota error was harness initialization order, not environment impossibility. AVC/H265 still explicitly unsupported with either no-B or B-frame source. Default browser remains unexposed. Restricted experimental VP9/Opus feasibility only; full pixels/PCM/config/timestamp fidelity not yet compared.

Limits: API enabled only in isolated experimental browser.; No claimed full pixel/PCM/timing fidelity, speedup or ordinary-browser availability.
