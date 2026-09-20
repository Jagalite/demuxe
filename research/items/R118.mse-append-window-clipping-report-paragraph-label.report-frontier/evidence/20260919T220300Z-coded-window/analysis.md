<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Initial harness incorrectly assumed the dependency-deficient1.5s seek would remain pending. It actually completed; waiting for a nonexistent pendingseek duringrecovery timed out. Full raw error retained, no candidateverdict fromtimeout.

Contributes to 20260919T220600Z-window-output. Captured raw outcomes unchanged.
