<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Presentation ownership gates

Prepared input, nine alternating owner pairs, exact output checks before and during timing. Metric complete owner wall time including independent output hash/readback verification and cleanup. Warm browser/cache; cold owners; other research work may run concurrently. No CPU utilization, physical energy or peak physical memory claim. Worker startup is deliberately included and dominates this tiny fixture.

## R318

Twelve exact64x48 H264 frames reversed within one closed GOP. One decoder/cache of12frames versus12 decoder owners replaying78 total packets. Full output plane hashes match independent FFmpeg source; dependent entry and >12-frame cache inputs reject. Cache closes12 retained frames;55,296 visible plane bytes, not native surface memory.

Baseline5.644ms; candidate0.711ms. Saving87.40%, paired bootstrap95[85.4166663993426, 89.38193316847808]. Predeclared lower95>=10% gate **passed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R289

Six compatible independent H264 IDR jobs, same configuration and duplicate external timestamps, unique internal dispatch times. Shared owner returns all six exact host hashes versus six owners. Middle canceled result discarded; malformed decode fails and fresh owner recovers; incompatible configuration and stale source-generation commit guards reject. No live midstream reconfigure or unrelated codec sharing claim.

Baseline1.844ms; candidate0.700ms. Saving62.05%, paired bootstrap95[56.521738502678595, 67.30769258690539]. Predeclared lower95>=10% gate **passed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R323

Two worker ROI consumers of12frames; cloned transferable frames versus upfront canonical CPU plane copies and reconstructed frames. Both share one decoded source. All24 worker output plane hashes match independently cropped FFmpeg planes. Actual held-frame cancellation closes before release, stale work suppressed, newgeneration succeeds. Bounded2leases and zero at teardown; workers terminated and URLs revoked. Candidate upfront application plane copy0 versus110,592bytes; this is not proof of physical zero copy.

Baseline9.533ms; candidate6.778ms. Saving28.90%, paired bootstrap95[-12.499999923662086, 56.27450994852183]. Predeclared lower95>=10% gate **failed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R118

Two worker ROI consumers of12frames: one shared decoder versus one full source decode per view. All24 ROI plane hashes exact independent FFmpeg crop, actual canceled held-frame release and nextgeneration exact. Bounded2leases; all frames and owners close. This is a cold-worker ROI-output component, not integrated canvas/player rendering.

Baseline6.889ms; candidate7.878ms. Saving-14.35%, paired bootstrap95[-40.90225623228005, 13.06930697790467]. Predeclared lower95>=10% gate **failed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

