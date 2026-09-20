<!-- SPDX-License-Identifier: CC-BY-4.0 -->

A one-second empty edit does not implement the required hold-last-picture behavior on the changing-frame fixture. Eleven of twelve middle-interval queries are wrong; actual continuous playback also shows changing source pictures through the supposed freeze. Earlier constant-red source concealed this difference. Stop the empty-edit freeze recipe; unchanged mdat alone does not prove timeline fidelity.

Correctness: Independent24distinct native whole-file frame references. Authored edit maps source0–1s, empty1s, then source1–2s; mdat exactly unchanged.36requestedpresentation images show11wrongmiddleimages, includingseek1.5s showing sourceframe6 instead ofheldframe11. Actualcontinuousmiddle frames also change (source12 then1..11), so this isnotonlypausedseek behavior. Outer source intervals andEOF pass; duration2.916667 ratherthanclaimed3s retained. Video-only, no soundtrack semantics.

Performance: Not applicable after wrong-picture freeze contract failure. Smallmetadata growth andunchangedpayload are not an accepted optimization result.

Next/reopen: Reopen with an explicit hold-frame representation or presentation policy whose full changing-picture timeline and endpoint match; preserve the constant-color prior result as insufficient freeze evidence. No sparse-decode claim.

Bounded research result, not production or release admission.
