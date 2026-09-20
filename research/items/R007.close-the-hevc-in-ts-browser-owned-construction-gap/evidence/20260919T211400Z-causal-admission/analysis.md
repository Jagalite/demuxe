<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Close scoped HEVC/AAC TS capability correctness: isolated candidate already has complete host pixels/PCM and actual browser seek/playback; new real configuration-change and backward-timestamp controls reject with causal engine errors and worker cleanup. No performance superiority claimed.

Correctness: Historical isolated Wasm remux retained complete decoded picture/PCM equality, actual browser playback and seek, AVC regression. New concatenated HEVC streams with changed160-to320 width and backward timeline trigger selected-configuration/timeline guards; both worker counts zero. Harness assertion mistake preserved separately from correct engine rejection. Scoped static HEVC/AAC only; midstream reconfiguration rejected, no general damage recovery/live discontinuity claim.

Performance: Primary contract is additional correct HEVC/TS browser-owned capability; existing unextended bridge rejects the valid source. No efficiency claim or equivalent accepted old-route baseline was part of this capability gate; benchmark is not forced for capability-only work per PROCESS. Hybrid CPU/startup comparison remains separate optional optimization study, not a demonstrated saving.

Next/reopen: Scoped prototype worth pursuit. Production integration requires explicit opt-in review and maintained regression coverage; reopen for new HEVC configurations, audio selections, or timeline/discontinuity policy. No default routing changes.

Bounded research result, not production or release admission.
