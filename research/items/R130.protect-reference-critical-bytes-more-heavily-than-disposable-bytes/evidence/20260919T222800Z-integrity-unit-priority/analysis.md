<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual96-sample predictive AVC file has both reference and non-reference VCL packets, but every one of its5 authenticated16KiB provider units intersects reference-critical bytes or required container/config metadata. At4KiB and1KiB, all18/69 units remain critical too. Under these whole-unit erasure boundaries, uniform protection and conservative importance protection have no distinct low-priority class. Stop this current provider profile before inventing FEC overhead; no general rejection of packet-level unequal protection.

Correctness: Bounded opportunity screen parses every actual length-prefixed AVC packet, distinguishes VCL nal_ref_idc and maps exact byte overlap. Both reference/non-reference classes exist; all IDRs critical, no non-reference IDR. No repair candidate is admitted because every current protected unit is critical; no decoding/fidelity success claimed.

Performance: No differing allocation exists at tested1KiB/4KiB/16KiB whole-unit granularity under conservative reference importance, so an equal-budget repair benchmark is not applicable to this profile. No synthetic favorable loss schedule or inferred network saving.

Next/reopen: Reopen with a concrete byte/packet FEC owner and source where authenticated protected units separate dependency classes, or an exact dependency graph justifying unequal weights among references. Then compare equal repair bytes over predeclared losses and verify reconstructed compressed bytes before decode.

Bounded research result, not production or release admission.
