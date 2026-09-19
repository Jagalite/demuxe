# Original ranked top100 campaign

Every original top100 catalogue item now has a recorded decision. **89 have a bounded viability/current-profile disposition; 11 remain unresolved.** This completes the feasible screening work, not 100 successful experiments and not production qualification.

The endpoint was “enough to see if it is worth further pursuit.” Ranking is the original catalogue order, not IDs R001–R100. Scope was kept to bounded component/runtime decisions and reused trustworthy prior evidence.

| Outcome | Items |
|---|---:|
| Further pursuit or retained regression coverage |70|
| Stop current profile or tested variant |13|
| Already covered by current behavior |6|
| Environment blockers |4|
| Missing trusted media fixtures |3|
| Setup blockers |3|
| Unresolved fidelity |1|
| Total |100|

Evidence: 85 items have new or reused experimental/measurement evidence, 5 are source-only applicability decisions, and 10 are prerequisite gates. The 85 includes negatives and inconclusive results; it is not a pass count. 54 latest records are new component tests and 4 are new real-path screens; additional prior experiments were reconciled rather than blindly repeated.

- [Every ranked item, full stable key, outcome, reason and evidence](ALL_ITEMS.md)
- [Further-pursuit backlog](PURSUE.md)
- [Unresolved items and exact blockers](BLOCKERS.md)
- [Latest machine-readable decisions](decisions-latest.json)
- [Append-only history](decisions.jsonl)
- [Verification record](verification.json)

## Material findings

- HEVC-in-TS played and sought through the actual isolated RemuxPlayer variant, with complete independent video/audio oracles. The simple PID-change option failed timeline continuity and remains a rejected variant.
- Real non-pthread JSPI reads/cancellation worked without isolation/SAB. The same isolated build handled genuine Matroska zlib compression. An ordinary AAC MP4 priming/trim negative is retained; universal remux support is not claimed.
- The strict JavaScript MP4 adapter, prepared native HLS delivery, mixed audio/video containers, configuration intervals, native alpha WebM, and H264 packet-copy WebRTC reception passed their scoped checks. WebRTC used a local mDNS diagnostic flag and a placeholder encoder; no encoder-free sender cost claim.
- Native APIs rejected ALAC; the small isolated Wasm decoder then reproduced all 96,000 stereo frames exactly. Actual Opus Ambisonic channel identity and a restricted directional matrix passed. A flat IAMF presentation worked through a host-extracted native FLAC component.
- Embedded ASS extraction read 764,367 bytes from a 7,873,050-byte source, including its exact font. Actual libass output matched independent demux on the muxed timeline. 8,372 small local reads still need coalescing before remote integration.
- Native cue windowing matched active cues with at most 22 native cue objects versus 10,000. ASS fade reuse needed two mask templates because the outline changes at full opacity.
- MP3 seek closure needed three prior frames at both tested targets; two were insufficient. This differs from the earlier report and must stay fixture-specific.
- Chrome applied the requested negative Opus head trim exactly; host FFmpeg did not. Their disagreement is retained, not flattened into a pass/fail generalization.
- Genuine HEIC tiles decoded but failed the exact raw-pixel oracle because of unresolved range/chroma behavior. CENC relocation preserved ciphertext and independent decrypted pixels, but direct ClearKey playback produced no observable decoded frames for either baseline or candidate.
- Independent native-video/PCM-worklet clocks survived seek/rate changes and starvation recovery. Active-phase error reached 80 ms; this needs tighter synchronization work and is not an acoustic-sync qualification.

## Limits and next work

The 11 unresolved items are ranks 12/14/25/88 (physical display or ManagedMediaSource environment), 26/29/31 (trusted Dolby Vision/MVC media and references), 38/41/42 (Basis or AV1 tooling/prepared fixtures), and 37 (HEIC fidelity). [BLOCKERS.md](BLOCKERS.md) gives exact keys and evidence. No inaccessible report identity remains among this top100.

Start future implementation from a scoped item in PURSUE.md, read its reason/evidence, and supply the missing confirmation contract before integration. Candidate functionality does not establish CPU savings, hardware acceleration, physical energy, release readiness, or automatic-routing safety. R193's next test must reconcile display-space color/range/chroma with an independent reference, not relax the raw oracle silently. R159 needs a destination construction that actually produces decoded frames.

## Workspace and reproduction

Production tracked changes were preserved exactly. No default route or shipped runtime was promoted; research builds remain in build/top100-ass, build/top100-jspi and build/top100-lossless or results/top100/transport. The completed research artifacts are committed locally at user request. No push was requested or performed.

From the repository root:

```sh
python3 results/top100/verify.py
python3 results/top100/summarize.py
```

Individual probes are tests/top100-*.mjs and the small Python scripts inside their evidence directories. Run only the relevant probe after a meaningful change; do not blindly rerun the whole campaign. Rerunning a canonical evidence file changes its hash: append an updated decision through record.py, then regenerate this report. Expected-negative harnesses (HEIC fidelity and direct CENC observation) may deliberately exit nonzero. Host-command/build records are preserved alongside fixtures; build-lossless.py and build-jspi.py reproduce isolated decoder/remux builds using the pinned local SDK/source prerequisites.

Runtime: macOS 26.5.2 / Apple M1, Chrome 152.0.7977.83, host FFmpeg 8.1.2; isolated FFmpeg 7.1.1 and Emscripten 4.0.14. Results are local profile evidence, not a browser/device matrix.

## Notices

Existing source and report notices remain in force. BBB-derived media: copyright 2008 Blender Foundation / www.bigbuckbunny.org, Creative Commons Attribution 3.0 Unported; see ../../docs/MEDIA-NOTICES.md and ../local-screening/runs/r47-bbbkey060-reference/MEDIA-NOTICE.txt. Font attribution/license remains fixtures/FONT-LICENSE.txt. Upstream FFmpeg, libass, zlib and font dependencies retain their own licenses; this campaign does not relicense them. New research scripts carry their own SPDX notices. Full upstream source remains in the pinned local build sources; no external publication was performed.
