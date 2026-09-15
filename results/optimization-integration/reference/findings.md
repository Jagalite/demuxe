# Routing optimization risk review

**The narrow baseline routes can continue toward integration; selective adaptation must remain experimental. General B-frame/nonzero-timestamp adaptation is blocked by a reproduced mux correctness failure.** This is a correctness pass, not a new CPU comparison or release approval.

The final selected evidence contains **53 passing and 2 failing browser cases**, plus **22/22 existing contract unit tests**. Failed historical attempts and passing reproducers are retained separately. No failure was converted into a pass by relaxing resource or fidelity limits.

## Isolation and provenance

Workspace: `/private/var/folders/p2/hs2582qs5672qbvtm4z5_9840000gn/T/demuxe-adapt.QUfsHU`. Review directory: `/private/var/folders/p2/hs2582qs5672qbvtm4z5_9840000gn/T/demuxe-adapt.QUfsHU/results/risk-review-20260915T015230Z`. Source remains **51f0792fa6c5229a8695d908006a0a573bfc1c10**, with no tracked source diff. Earlier prototypes, reports, patches, fixtures and raw results were not overwritten. Risk-review code lives here, including copies of the adapter and worker. No other checkout, HLS/DASH agent work, worktree or uncommitted state was accessed. No commits, publishing, dependency rebuilds or new engine downloads occurred.

The machine is the same Apple M1 MacBook Air, 8 logical CPUs/8 GiB, macOS 26.5.2; one browser product, installed headed/unmuted Chrome **152.0.7977.83**, sequential fresh profiles. Runtime hashes were rechecked against prior evidence: **34 unchanged runtime/fixture files** in `raw/runtime-hashes.json`. Hybrid Wasm SHA256 is `aaecdfba476793db8576754a08c73a6168c2da5802178970b60e3ad42af83f02`; adaptation Wasm is `4342db5874e1aff37d078369a19c41e16c123d41714ebf5977ae385ab53b5d3a` (`@libav.js/variant-webcodecs@6.10.9`). The existing libass-wasm 4.1.0 worker/Wasm and DejaVu font are unchanged; only a review-local loader copy has the two-line resize fix.

The investigation started 2026-09-15 01:52:30 UTC; the hard deadline is 02:37:30 UTC. Final cleanup timing is in `raw/completion.json`. Recorded case wall time across all attempts is 227.9 seconds. Counting all of that as playback and adding sixty seconds for gaps gives a conservative **287.9-second bound**, below twelve minutes. This deliberately includes pauses, failed opens, fixture audio-only audits and cleanup. All work stayed inside the lab clean environment; test servers used OS-assigned ports. No concurrent development process was stopped.

## Coverage inventory and actual pipelines

PASS means the named short case passed, not general qualification. Detailed requested/actual plan, generation, worker/MSE identities, output signal, packet counters and teardown are in the indexed raw cases.

| Optimization | Implementation / actual configuration | Result and evidence |
|---|---|---|
| Native direct | Public Player, compatible H.264/AAC MP4, native video/audio decoder and `<video>` presentation | **PASS**: direct plan, moving pixels/audio/seek, no adaptation/remux worker; public source replacement and mute |
| Native packet-copy remux | Public Player `nativeRemux:always`; existing FFmpeg packet remux → single multiplexed MSE buffer → `<video>` | **PASS**: playback, seek, teardown, authorization refusal; no transcoding introduced |
| Native FLAC | Scratch: H.264 packets copied; PCM24 stereo48k → FFmpeg FLAC24 → fragmented MP4/MSE | **PASS** for original fixture, bounds, samples and lifecycle; **FAIL** for new B-frame/nonzero-start fixture |
| Native Opus | Scratch explicit `allowLossy:true`; PCM24 stereo48k → libopus160kb/s stereo48k → fragmented MP4/MSE | **PASS** original fixture and independent audio drain/sample-count audit; **FAIL** same B-frame fixture |
| Native Web Audio gain | Existing scalar GainNode after MediaElementAudioSourceNode; `<video>` owns A/V | **PASS** 0.5 amplitude, zero gain, restoration and actual element mute; not arbitrary filters |
| Hybrid unfiltered | Public Player; WebCodecs → retained VideoFrame presentation, mpv/FFmpeg → PCM/AudioWorklet | **PASS** original/new B-frame fixture, overlapping seeks and public replacement |
| Hybrid audio-only filter | Scratch backend `set af lavfi=[volume=0.5]`; actual decoder remains WebCodecs, mpv owns audio | **PASS** signal/seek/cleanup. Public constructor and dynamic setter **do not support this combination** |
| Software same filter | Public Software constructor with the same lavfi volume filter; software decoder/RGB presenter, mpv/PCM output | **PASS** correctness reference, amplitude/mute/seek/cleanup |
| FLAC + ASS | Separate existing libass worker/canvas synchronized to the video element | **PASS after local paused-resize fix**; authored animation, cue state, font, pause/rate/seek/resize |
| FLAC + ASS + gain | Small combination of existing scratch components | **PASS** seeded shared sequence and signal/ownership checks |
| Buffered Native seek | Scratch existing-session fast path, serialized by review fix | **PASS** worker/MSE/SourceBuffer identity retention, real removed buffer hole forces regeneration, stale output rejection |
| Native direct + ASS | Existing overlay attached through test harness, no audio adaptation | **PASS after same paused-resize fix**; not public native ASS capability |
| Smaller first / normal steady fragments | Existing 600ms first fragment, then keyframe fragments | **PASS** narrow pilot/packet checks; no new performance claim |
| FLAC setting variants | Only existing fixed compression_level=5; no variant prototype | **NOT TESTED / NOT IMPLEMENTED** |
| Explicit compiled-module/worker reuse | No reusable adapter owner implemented | **NOT TESTED / NOT IMPLEMENTED**; browser code caches are not a reuse prototype |
| Reduced Hybrid compressed-packet copying | No enabled experimental candidate in tested runtime | **NOT TESTED** |
| Packet-format/init adaptations | Existing AVC/Annex-B/config helpers and remux | **PASS** narrow remux pilot and existing contract units; not a browser format matrix |
| Qualified Native/Hybrid GPU effects | No corresponding candidate available | **NOT TESTED / NOT IMPLEMENTED** |
| Software YUV/GPU presenter | Source exists; required matching engine artifact absent | **BLOCKED** without a new engine build; no build attempted |
| Separate audio/video MSE SourceBuffers | Tested adapter/remux use one multiplexed SourceBuffer | **NOT TESTED / NOT IMPLEMENTED** in these paths |
| WebCodecs audio decoding | Not integrated in tested playback paths | **NOT TESTED / NOT IMPLEMENTED** |
| Authenticated unchanged-byte transport | Earlier prototype preserved | **NOT TESTED — intentionally deferred** |
| Hybrid→Native handoff | Proposed | **NOT TESTED — intentionally deferred** |
| General browser video transcoding | Outside scope | **NOT TESTED — intentionally deferred** |
| Independent native-video/audio clocks | Outside scope | **NOT TESTED — intentionally deferred** |
| HLS/DASH, live/low-latency, DRM | Other work not inspected | **NOT TESTED — intentionally deferred** |

Browser Native hardware decoder identity was not independently identified. Hybrid reports `decoder:webcodecs`; Software reports `decoder:software`, `softwarePresenter:rgb`. Adaptation proves zero FFmpeg video frames decoded/encoded and zero copied-payload mismatches. Native direct absence of adaptation workers is asserted separately from the legitimate libass worker. A separate public automatic-open test keeps the compatible MP4 direct without adaptation workers; automatic opening with the audio filter selects Software; public Hybrid constructor/setter reject it. Scratch policy rejects implicit Opus, but does not establish production fidelity admission or downmix policy.

## Executed reusable groups

The main end-to-end run is `reruns/2026-09-15T02-15-25.082Z`. The stronger resize assertion was reproduced in `reruns/2026-09-15T02-17-28.750Z`, then fixed and compared to Hybrid in `reruns/2026-09-15T02-19-06.006Z`. The selected latest case list is `raw/final-case-index.json`.

| Result file | PASS | FAIL |
|---|---:|---:|
| `pilots-after.json` | 12 | 0 |
| `transitions-final.json` | 3 | 0 |
| `faults-final.json` | 8 | 0 |
| `races-final.json` | 4 | 0 |
| `gain-steady.json` | 3 | 0 |
| `ownership-final.json` | 3 | 0 |
| `audio-fidelity.json` | 2 | 0 |
| `transport-recovery.json` | 4 | 0 |
| `policy-timeline.json` | 4 | 2 |
| `buffer-subtitle.json` | 4 | 0 |
| `mute-output.json` | 4 | 0 |
| `public-admission.json` | 2 | 0 |

The seeded rich test uses **0x51f0792**, an explicit 21-operation order and deterministic short jitter. It covers play/pause, buffered and distant seeks, active cues, rates, visibility/gain, resize, audio-context suspend/resume, replacement and destruction. Overlapping seeks are a separate minimal test against Hybrid. Real MSE removal checks current ranges rather than an append-history approximation. Same-source identity and codec are bound to fast-path eligibility in the review copy; arbitrary dynamic codec changes are not qualified.

Native seek recovery waits for a matching `requestVideoFrameCallback` and captures moving-video pixels; it does not accept `seeked` alone. Hybrid recovery uses source position and rendered-frame counters, so its per-seek first-frame evidence is weaker. Digital audio is measured at an analyser. New-frame/time assertions do not prove physical speaker/display synchronization. Source replacement tests public source IDs, preservation of pause/rate/mute and rejection of an old Hybrid audio track ID. Only one selectable audio track exists in these fixtures; switching between multiple real audio tracks is **not tested**. Adapter replacement is destroy-old/open-new; seamless same-owner replacement is not claimed.

## Failures, fixes and remaining blockers

| Finding | Severity / origin | Reproduction and outcome |
|---|---|---|
| Two overlapping adaptation seeks corrupt authority; both can reject and playback stays at zero | **High**, pre-existing scratch optimization lifecycle | FLAC fails while Hybrid passes. Serialized seek operations plus reset generation checks now pass; original `transitions-before.json` retained |
| Destroy before asynchronous open resumes creates a late worker/object URL | **High**, scratch optimization | `races-before.json`; active/destroyed checks before/after reset and idempotent destroy fix it |
| Worker error leaves pending RPC until timeout | **High**, scratch optimization | Synthetic held request reproducer and real outstanding demux-read barrier; worker error now rejects pending RPCs promptly and forced worker termination releases ownership |
| Distant seek resumes an explicitly paused adapter | **Medium**, scratch semantics | Before/after pause-intent reproducer; removed unconditional play-intent reset |
| Resolved MSE source-open timeout remains scheduled | **Low**, scratch ownership | Repeated cycle detects pending timer; completion/cancellation now clears it, three cycles leave zero timers |
| Paused resize blanks rich subtitles on both direct and adapted Native | **Medium**, shared standalone libass loader behavior, not audio conversion | Strong visible-cue assertion fails both. Redundant canvas dimension assignments cleared pixels; two conditional assignments in a local loader copy fix it. Hybrid/mpv reference retains captions. Blank and corrected screenshots preserved |
| B-frame/nonzero-start adaptation emits non-monotonic video DTS | **High, unresolved**, fixture-specific adaptation packet/timestamp assumptions | FLAC and Opus fail with `mux packet: -28`; mux log: `33600 >= 32528`. Hybrid passes. Reproduced in initial and reusable suite. General admission remains blocked |

The B-frame failure is not repaired by re-encoding video or weakening the fixture. The adapter reconstructs missing DTS from PTS, hardcodes an AVC MIME and assumes a 90-second source timeline. These assumptions must not become general routing rules. The current evidence does not isolate B-frames versus nonzero start into independent causes, so causality beyond the observed non-monotonic DTS is limited.

Test-harness corrections are separately preserved: ordinary direct playback must not request an immutable transport contract; libass is not an adaptation worker merely because its URL contains `/adapt/`; Hybrid replacement needs an immutable contract on the original no-ETag fault server; automatic public admission correctly refused missing source trust until the normal fixture server supplied actual SHA256 ETags; the original gain sampler measured queued transitional audio; a controller scheduling promise is not the outstanding conversion-step promise. An initial unit invocation used the lab directory instead of repo-relative CWD; the corrected invocation passes 22/22. None of these is presented as a product fix.

## Audio fidelity and timeline evidence

The unchanged main fixture is 90 seconds, H.264 baseline720p30/no B-frames, PCM s24le stereo48k, with moving visual and periodic digital audio markers. Adaptation pilots compare copied video payloads and decode generated FLAC packets against the exact pre-encoding packed-s32 sample FIFO, before gain or AudioContext resampling.

The one new fixture is `web/edge.mkv`, SHA256 **d33c19a7948a5a4ec46c0bd0902ecc0335391c2690121994d42c5eceb110f98a**. `fixtures/generate.sh` and `raw/edge-probe.json` record H.264 High640×360/30fps, two B-frames, **2-second starting timestamps**, **8.1 seconds video**, **7.417 seconds audio**, distinct left440Hz/right660Hz signals and different marker tones, PCM24 stereo48k. It has **356,016 samples/channel**, awkward for both 4,608-sample FLAC frames and 960-sample Opus frames. Native FFmpeg generated it only; it was not used as a playback converter.

Because full adaptation fails video muxing on that fixture, a separately labeled **audio-only Wasm audit** discards 243 compressed video packets without decoding them. It then uses the same audio FIFO/encoder and decodes its generated audio packets:

- **FLAC:** 356,016 samples/channel encoded and decoded; **712,032 interleaved samples compared, zero mismatches**, 48k/stereo/24-bit, channel order preserved. First audio/packet PTS2.0, last packet end9.417. No downmix or resampling precedes comparison.
- **Opus:** explicit 160kb/s stereo48k lossy conversion; independent decoder selected by codec ID. Decoded sample count is **356,016/channel**, including final partial-frame drain/padding behavior. First encoded packet PTS1.9935 for source audio at2.0 (6.5ms encoder delay); final packet end9.417. The returned decoder first-PTS also includes that offset; sample count equality is not independent proof of audible onset alignment. No sample-exact claim is made for Opus.
- Both original 90-second audiovisual routes separately reach real ended state at90, with decoded/encoded counts equal for the tested tail and no payload mismatch. The new fixture's end-to-end final video/audio cannot be qualified because muxing fails first. There is no claim that an audio-only audit clears that failure.

Steady gain ratios were approximately 0.5005 FLAC, 0.4998 Hybrid and 0.4997 Software in the diagnostic rerun; the reusable run contains individual values. The output barrier records roughly 350–380ms mpv queued-audio response versus tens of milliseconds Native in that check, not a CPU benchmark. Gain0, restoration and actual playing mute/unmute pass. This qualifies one scalar operation only, not arbitrary FFmpeg filters, positive clipping, EQ, multichannel layout changes or rate/pitch equivalence.

ASS checks use the authored positions/styles, karaoke/rotation, active cue after seeking, DejaVu custom font, pause stability and rate/resize. Screenshots were visually inspected, including the blank paused-resize failure and its fix. Font selection strings and canvas pixels support these specific cues; no exhaustive shaping or pixel-identical renderer claim is made.

## Bounded work, faults and ownership

The retained policy is target10s, refill below5s, complete-fragment allowance under13s, 8MiB application output cap per main/worker queue, and four 256KiB input cache blocks. In each of three paused cycles, accepted source reads stop at **13,893,632 bytes** including **2,097,152 metadata bytes**; audio decode reaches582,656 samples and encode580,608 (remaining partial FIFO is intentional until continued processing/drain). Cumulative generated output is10,725,310 bytes; **peak retained fragment is1,816,738 bytes**, input cache1,048,576. Maximum processing ahead is about12.13s. Cumulative generated bytes are not simultaneous retained bytes. MSE internal coded/decoded storage and native libass allocations are only indirectly observable.

Each cycle ends with **zero owned workers, AudioContexts, object URLs, intervals, timeouts, media elements and canvases**. Worker histories record accepted reads, output, aborted requests and released contexts. A failed worker is forcibly terminated rather than claiming its FFmpeg free functions ran. Browsers can retain caches/shared mappings; no RSS-return-to-baseline assertion is made, and no endurance claim follows.

Real owned-server fault tests cover stalled response bodies, truncation, wrong Content-Range, ignored range,401/403, and one503. Errors settle explicitly and attempts are bounded; the adapter does **not** retry503 automatically. Invalid responses never become successful EOF. A separately released stall resumes usable output. Active cancellation first proves a held body/current RPC or `SourceBuffer.updating`; delayed completions are then released and cannot revive ownership or accepted output. The server counts bytes it attempted to send; worker sourceBytesRead counts validated bytes handed to the reader, not all failed wire traffic. Error stats may report an outstanding read until cleanup clears it; this is not proof of an active network request after rejection.

Test-only `risk-hold` and `risk-crash` messages are labeled injections. The stronger crash case has already encoded audio, then deliberately holds a real demux read before raising a worker exception. Baseline remux and Hybrid also refuse401 without blind Software fallback. No real credentials are used; raw logs contain test paths and errors, not authorization secrets. Arbitrary retry recovery, all cancellation micro-phases and source-content mutation with a valid-looking range response are **not qualified**.

## HLS/DASH handoff

**Reusable unchanged:** the existing 22 codec/selection/buffer contracts; gain-output assertions; packet/sample equality assertions; owned-server401/range/truncation behavior; generation/latest-operation and teardown assertions once attached to the same semantic hooks. `README.md` gives exact commands; `run-all.mjs` was executed and writes fresh timestamped evidence. Expected unresolved cases produce nonzero exit status.

**New adapter hooks required:** integrated actual plan/decoder/presenter; source/timeline/configuration epochs; session/worker/MSE identity; selected public track IDs; outstanding fetch/conversion/append barriers; current buffered ranges; source-byte and decoded/encoded counters; first correct presented frame and audio signal; and explicit owner shutdown. Current scratch tests sometimes access `player.worker`, `sb`, `pending` or backend commands directly—do not mistake those for public capabilities.

**Contracts to preserve:** source and track identity isolation, latest-operation authority, pause/settings preservation, no stale append/frame/cue, clear starvation-versus-EOF distinction, real byte counts, bounded retry/read-ahead, packet DTS/PTS validity, audio delay/drain accounting, safe gaps, independent explicit lossy policy and complete resource release.

**Still required after streaming integration:** ABR switches, live-window eviction, moving seekable ranges, DASH periods, initialization changes, discontinuities, segment retry/key/auth changes, partial segments, end-of-live semantics, rendition track consistency, and any cross-engine handoff. This review does not qualify any of those, DRM or physical A/V synchronization.

## Decision

- **Safe to continue integrating, with stated limits:** baseline direct/remux/Hybrid/Software behavior on these fixtures; the narrowly tested gain mapping and buffered-seek/lifecycle fixes are useful handoff candidates, not blanket release approval.
- **Keep experimental:** Native selective-audio adaptation, standalone ASS integration and smaller first fragments. Carry the lifecycle and paused-resize reproducers/fixes forward; public routing/filter-policy support remains separate.
- **Blocked by identified correctness problems:** broad FLAC/Opus adaptation admission for B-frame/nonzero-timestamp media. Keep Hybrid as the working reference for the failing fixture until timestamp/mux correctness is implemented and rerun.
