<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Source definition

The user requested an executed research item exploring compressed-domain/reduced-resolution and progressive scrubber thumbnails, with multiple paths forward and local-agent continuation only where this environment cannot finish testing.

Prior architectural intent: an independent preview subsystem should not seek/flush the main playback engine; providers should be replaceable; research must be removable without redesigning the controller/public API. Investigate before committing to a custom decoder.

Hypothesis: reducing unnecessary frame work, using reduced reconstruction where supported, and optionally emitting an early result can improve useful preview delivery. These mechanisms should be tested separately against their appropriate baselines, with timestamp accuracy and spatial quality reported independently.

Output: documented component evidence, failures, prototype code, source/fixture hashes, scoped decisions and a bounded follow-up. Not a request to make unqualified playback/default changes or to treat exploratory native numbers as browser measurements.
