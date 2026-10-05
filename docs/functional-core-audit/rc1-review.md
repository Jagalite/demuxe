# 1.1.0-rc.1 ownership review

The post-reduced-v1.0.0 source review and fixes cover provider preference capture and recovery, verified optional Shaka loading, preview sampling and hover refinement, bounded AVC presentation ordering, and presentation-only layout composition. This refresh reconciles the earlier frozen inventory with those reviewed changes; it grants no browser, native-build, performance, endurance or release qualification.

Preferences are frozen copies bounded by 64 rules and 256 IDs per rule. They reorder only admitted alternatives and never confer qualification. Transport recovery uses the same ordering as runtime recovery; pinned and terminal failures remain rejected. Selection scratch arrays and deployment availability projections retain their finite recipe bounds.

The new Shaka API is an erased ambient declaration. Deployment adapters remain borrowed physical handles; loaders are weakly keyed by deployment. Existing pure load/consumer accounting and acquisition settlement still own script, URL, timer and promise release.

Preview samplers are callbacks supplied with immutable snapshots. Results are checked for finite source timestamps and a maximum of 256 entries. Custom completion cooldown retains at most 256 bucket keys, advances past unsuccessful samples and resets on source replacement. Timer and running-request cardinality remain one each. Hover refinement has one cancelable 180ms timer, fenced by hover and preview owner identities. Frame cache byte and entry limits still control retention.

AVC order metadata is bounded by a 64KiB description, at most 16 reorder frames and the existing 32-frame queue. Timestamp access precedes policy capture to preserve retirement under reentry. Frames remain physically owned by the adapters until delivered or closed. Flush drains the sorted pure identities; reset/retirement clears them and closes associated handles.

Selective PCM publication polls only within its original absolute startup deadline. An acknowledged even epoch can authorize output only for the current lease before its first timestamp. Pause, destroy and stale callbacks cannot authorize later output. Layout rules move existing controls and restore connected focus without selecting routes or reopening sources. Autoplay respects keyboard focus; settings dismissal removes rendering immediately.

Validation before candidate freeze: 3,336 unit tests and consumer type checks passed. Native builds and the exact archive qualification remain separate obligations.
