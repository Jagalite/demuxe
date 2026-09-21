<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Granular engine loading: bounded research plan

Hypothesis: a smaller browser-video Hybrid engine, retaining audio/subtitle processing and the complete Software fallback, reduces initial compressed transfer and compilation/startup cost without changing the tested output. Compare a full relinked Hybrid baseline, metadata-stripped shipping code, and a lab Hybrid registry without software video decoders. No production source, routing, binaries, or default preparation changes.

Scope: Chrome Hybrid for synthetic H.264/AAC/ASS and the externally held user HEVC Main10/AAC/ASS MKV; Firefox automatic HEVC rejection and Software fallback. User media stays at /Volumes/seed2/Projects/startup-repro/software_test_slow.mkv and is neither copied into research nor published. Its permission/license remains NOASSERTION; measurements only.

Screen: actual linked raw/gzip sizes, Wasm custom-section inventory, static codec registration reachability; review lazy independent components and Emscripten dynamic linking/thread constraints. No toy side-module benchmark is evidence of mpv/FFmpeg startup.

Correctness gate: actual WebCodecs ownership, nonzero audio sample progress, known synthetic video matching independent host FFmpeg at fixed seek times (tolerant RGB), ASS on/off visual difference and baseline/candidate comparison, seek/pause/resume, source replacement, clean destroy, unsupported browser fallback. A deliberately wrong-time/wrong-picture reference must fail the picture gate. Physical audio output, full-file endurance, every codec/filter, HDR and arbitrary adaptive streaming remain excluded.

Performance only for passing variants: paired fresh headed Chrome processes, three pairs alternating baseline/candidate for local startup on the user file; a smaller compressed-asset network experiment if worthwhile. Explicit mode and file identical. Record first verified paused frame/open, play return, advancing-video observation, loaded asset bytes, browser, selected decoder and cleanup. Browser launch excluded. Report cold process rather than claiming flushed OS cache. Network experiment limits only Wasm asset delivery, not a whole-device network emulator.

Success threshold: at least 20% lower gzip Hybrid bytes, and at least 10% AND 100ms lower median startup under one declared condition without wrong output or lost fallback. Size success alone is not a latency success. Report all samples and negative variants. Memory, CPU and size are distinct; no power or hardware-acceleration claims. Stop a candidate on fidelity/lifecycle failure, preserving evidence. Effort: one registration-pruned link candidate, one metadata-only strip candidate, targeted retries and bounded tests; no production refactor or decoder-module integration.

Decision: recommend pursue, stop_current_profile, inconclusive or blocked separately for metadata stripping, lean Hybrid and true runtime codec modules. Record prerequisite work and maintenance costs. Existing component-isolation evidence is historical only and not added to savings.
