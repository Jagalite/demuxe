<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Non-isolated playback production completion

The user authorized committing the existing foundation and completing and testing
this feature for production on 2026-09-30. Work continues in
`codex/nonisolated-software-20260929`. The foundation is commit `24a3a9bf`.

## Completion contract

Pages without COOP/COEP must be able to use the existing finite playback plans
with the selected JSPI or Asyncify runtime. Software must cover the existing
Software codec matrix, and Hybrid must retain browser video decoding with mpv
audio. Supported settings, tracks, subtitles, filters, source authorization,
seeks, EOF/replay, interruption, replacement and destruction must behave through
the public Player. Source and feature admission must follow actual shipped
assets and tested contracts. Capability reporting must match that admission.

Native/remux routes must retain their existing behavior. Isolated pthread
playback must pass regression checks. Unsupported source/browser constraints
must report a specific rejection; capability signals cannot establish playback.
No production deployment or merge follows automatically from this worktree.

## Implementation and qualification sequence

1. Commit the tested cooperative Software foundation and evidence. Done.
2. Connect public construction, finite admission, preparation and capabilities;
   qualify all six original Software fixtures through public Player on Chrome
   JSPI, Chrome forced Asyncify and Firefox Asyncify. In progress.
   Chromium JSPI and forced Asyncify passed all 12 public cases after repairing
   canvas presentation ownership. Firefox and continuous playback remain pending.
3. Expand the private playback codec/filter build to the upstream LGPL Software
   profile and port remaining public settings, subtitle/font and snapshot methods.
   Qualify the additional existing format and feature rows with independent
   decoded picture/audio/subtitle references. In progress: dependencies built;
   pre-instrumentation optimization repairs the full VP9 Asyncify local limit.
4. Implement private Hybrid video ownership, complete configuration/seek/packet
   lifetime and fallback contracts. Qualify Hybrid rows and preserved native video
   plus remux/adapted audio rows. In progress: bounded retained decoder and
   cooperative mailbox adapters have resource and cancellation unit coverage;
   native integration and public Hybrid qualification remain pending.
5. Remove prototype-only file/duration restrictions when bounded readers, seek
   policy, resource handling and representative long/large sources pass. Qualify
   HD continuous playback and lifecycle/error/cancellation stress. Pending.
6. Include the private playback profile in the clean release recipe, source
   companion, runtime closure and asset manifests. Qualify both runtime consumers
   against the exact assembled archive and regression tests. Pending.
7. Review and fix remaining findings; update README/support documentation from
   accepted public evidence and commit the production implementation. Pending.

Full CPU benchmarks remain excluded as agreed in the preceding qualification
request. Continuous playback cadence, audio fidelity, A/V progress and resources
remain correctness gates. No claim of physical HDR output, browser hardware
acceleration or performance parity follows from decoder execution alone.

## Evidence ownership

New runs belong to `research/items/nonisolated-full-software-playback/evidence/`
with fresh UTC IDs. Preserve failed runs and original manifests. Large raw media
captures remain locally available outside Git with hashes in historical manifests
and `RAW-ARTIFACTS.json`; source snapshots, results and commands are committed.
