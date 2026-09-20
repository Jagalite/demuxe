<!-- SPDX-License-Identifier: CC-BY-4.0 -->

The paused full decoded picture remains exact after removing compressed backing through4s: currentTime remains1.5s while buffered start moves4.021402s. A seek into removed data demonstrably stays pending and displays the old wrong-for-target picture until explicit reappend; rehydration restores exact old and forward target images.

Correctness: Actual AVC/AAC native MSE, independently decoded whole-file full160x96 image oracle. Before/after paused image at1.5s identical and exact, readyState4, noerror. Removed.5s seek remains pending350ms and oldpicture differs from correcttarget; samebytes reappend completesseek with exacttarget image, forward6.3s exact; cleanup verified. Source-report pausedsurface retention only, no audio replay ordecoder-reference retention claim.

Performance: No physical memory, decoder surface reclamation or resource-saving claim. Logical buffered-time removal is directly observed but cannot qualify physicalmemory economics; the source report explicitly disclaims those. Capability endpoint has no applicable cost benchmark.

Next/reopen: Bounded paused-surface report complete. A production memory policy must separately measure actualretention and rehydrationcost and retain explicit removed-range recovery; no automaticaggressiveeviction policy is authorized by this result.

Bounded research result, not production or release admission.
