# Local-agent handoff: focused Demuxe screening

## Mission and provenance

Continue the seven bounded questions in REPORT.md. Preserve the distinction between new scoped ideas, extensions of existing research, negative screens, and completed production qualification. Repository documents were reviewed at `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`; these prototypes were executed independently of the Demuxe player. No repository changes have been made.

D01–D07 are temporary batch labels. Read the current research index before assigning an R-number. In particular, do not overwrite prior R367–R393 work that may exist outside the reviewed branch or fill the missing-definition records with these ideas. Prefer a scoped extension under the existing full item identity when appropriate. Do not inflate the experiment count by counting assertions, browser subset trials, and reused fixtures as separate independent mechanisms.

## First actions

1. Verify `checksums.sha256` from this package's root. Read REPORT.md and evidence/environment.json, verification.json, and the relevant per-stage logs before running anything.
2. In the authorized local Demuxe checkout, record the actual current commit and dirty-tree status. Locate the maintained construction/admission boundary and identify whether each transformation is already implemented or already researched. Preserve existing uncommitted work. Read repository contribution/research instructions.
3. Reproduce this package separately with `bash run_all.sh`. It archives prior evidence under runs/. An environment mismatch is a new profile, not a reason to overwrite historical outcomes. The actual recorded tests use Chromium 144 on Linux, not the repository's earlier Chrome 152 profile.
4. Reconcile observations before integrating a small research-only adapter. Do not copy these bounded fixture parsers into production as general media parsers. Keep the unmodified fixture, reference outputs, and adversarial controls.

## Priority and scoped work

### D01 — first native-route candidate: AAC PCE equivalence

Parent: `R119.canonicalize-equivalent-decoder-configurations`; the previously qualified operation was duplicate AVC parameter bytes, not AAC semantic equivalence.

Find the AAC AudioSpecificConfig/ESDS path. Implement a strict, bounded admission guard for the demonstrated AAC-LC stereo profile only. Parse the actual PCE: object type, frequency, channel groups, element IDs/tags, coupling, mixdown declarations, alignment and extension bits. Explicitly reject unsupported flags, uncertainty, truncation, multichannel layouts, configuration changes, and in-band PCE changes until separately qualified. Do not assume a channel count alone proves equivalence.

Preserve ES identifiers, descriptor flags, buffer/bitrate fields, track identity, all packet bytes and timing, and requested channel meaning. Rebuild lengths and validate the final structure. A same-size free-box view is an option, not a requirement if the production writer already safely handles offsets.

Required next evidence: original MSE failure versus adapted success in the actual Demuxe route; original/rewritten packet identity; all decoded PCM equality against an appropriate reference; actual MSE streaming PCM before and after seeks, including priming/tail handling; malformed and unsupported-layout rejection; repeated configuration and cancellation cleanup. Whole-file decodeAudioData success is not sufficient to close streaming audio correctness. Then measure complete equivalent playback work against the existing fallback and an already-compatible native reference.

### D05 — parallel correctness work: validate before publishing decompressed packets

Parent: `R358.unwrap-matroska-track-compression-before-choosing-a-decoder`.

The prototype observed full packet output before bad/truncated zlib streams reported failure. Wire a transactional packet boundary: no bytes become decoder input until the unit has completed required validation. Track source epoch and cancellation; never publish completed work into a superseded epoch. Bound accumulated bytes per packet and across tracks/sessions, not just per loop iteration. Exercise malformed input, expansion, delayed errors and cancellation in the real adapter.

Do not claim a 64 KiB total native memory bound from this package. The cap only covers retained quarantine chunks; browser internals, oversized emitted chunks, input and joined output remain separate. Measure those costs where possible, and record unresolved limits explicitly.

### D02 — selected-track fragmented MP4 projection

Parents: R059 selected-track MP4 views and adjacent R013 disabled-track work.

Qualify a video-only request first. Never remove requested audio to make a failure appear to pass. The coherent tested subset removes audio `trak`, `trex`, and all corresponding `traf` structures using size-preserving free boxes. Validate track references, fragment addressing, sample offsets, auxiliary data, source flags, indexes and encryption declarations. Reject encrypted or structurally unsupported profiles unless independently qualified.

Preserve video packet hashes, PTS/DTS/durations, all source media bytes and useful source offsets. Note that discarded-from-view audio bytes still exist: this is not privacy redaction or automatic bandwidth reduction. Measure actual allocation/copying; the Python prototype constructs byte arrays and proves neither zero-copy nor lower memory. Only extend to hybrid audio after the separate audio owner's fidelity and clock are qualified.

### D04 — exact six-channel FLAC destination

Parent: `R057.probe-a-real-six-channel-native-flac-destination`.

Retain the whole-file 24-bit sample-exact and wrong-clock controls. Next validate actual streaming A/V with explicit channel identities, priming, timestamp continuity, buffering, seek/tail behavior and cleanup. Keep native Web Audio channel output separate from physical speaker capability. Include the cost of input decoding and FLAC generation: FLAC is not a free carrier, and a valid destination does not prove it is cheaper than the current PCM output.

### D03 — preserve the negative result

Do not add compulsory two-byte-to-four-byte AVC prefix conversion to this tested destination. Two valid representations already worked; the mismatch negative failed. Locate current packet handling and add a destination-qualified bypass only if an unnecessary conversion actually exists. One-byte lengths, additional browsers, codec configurations and ownership requirements remain separate questions. Avoid benchmarking a conversion the maintained player never performed.

### D06 — compatibility-island ownership experiment

Parent: `R116.compatibility-islands-use-software-only-for-the-troublesome-section`.

Use island_component.json for the declared 12-picture AVC prefix, 12-picture MPEG-2 middle and 24-picture AVC suffix. Resolve actual track configuration, random-access points and source-to-output timestamp mappings. The recorded prefix/suffix are separate fresh MSE presentations, not a demonstrated handoff.

Implement only one bounded continuous transition experiment. Hold the requested timeline, presentation color meaning and audio clock stable. Validate both boundaries using picture ordinals/timestamps, visible output, dropped/duplicated frames, and audio continuity. Add cancellation and seek-across-boundary tests. On a platform where the middle codec is browser-supported, classify that profile honestly rather than forcing a false unsupported premise. The initial 10-bit AVC middle was browser-playable here and is retained as a failed blocker assumption.

### D07 — small route-search methodology

Parents: broad R131 equivalent-representation search / R171 discriminating-test ideas; this screen reuses D02 observations.

Separate three predicates: structural validity, requested-semantic preservation, and destination acceptance. Only cost-rank candidates after all three qualify. The smallest browser-passing subset retained an orphan trex; do not canonize that as a valid minimum. Limit candidate families and budget before execution; prune by known dependencies, then retain all negative outcomes. Do not present the eight subset trials as eight independent compatibility wins.

## Shared gates and reporting contract

Keep stages separate: definition, bounded component feasibility, integrated correctness, performance, production admission. A successful smoke test cannot close all stages. Record runtime version, OS, hardware, actual selected route and fixture identity for every result.

For browser pictures, retain the corrected witness: a seek event alone is insufficient; wait for a presented frame whose media timestamp matches the expected source frame before sampling. Preserve early failed/superseded logs and explain corrections. For decoder comparisons, record whether implementations share a library; do not call them independent algorithms merely because they run in different processes.

Before performance work, predeclare the equivalent-work baseline, input distribution, requested semantics, minimum worthwhile change, warm/cold handling, randomized paired runs, and uncertainty analysis. Include preparation, reading, copying, encoding, decoding, rendering, memory, and cleanup relevant to the claim. Use real longer assets only once the small controls pass. A playback-support probe or a small-byte rewrite is not measured CPU, energy or hardware acceleration.

Return a per-item decision (pursue / stop scoped profile / blocked / already implemented), exact parent or new item identity, supported scope, actual execution, artifacts and next smallest gate. Do not revise repository totals or push changes unless authorized by the user's repository workflow.
