<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bounded screen contracts

Recorded before candidate timing comparisons.

## R74 packed PCM

Exact S16/S24 samples, counts, selected layout, packet-copied video and relative timestamps must survive. The reference is the freshly built, verified ABI-2 FLAC engine. The diagnostic observer times allocation, validation/copy and FIFO write together; this intentionally overestimates the portion a staging bypass could remove. It also counts frames and bytes. It does not time browser destination audio or establish CPU savings.

Initial patch-effort gate: investigate a bypass if this upper-bound stage exceeds both 2 ms per three seconds of source and 5% of worker remux wall time on a representative case. Otherwise record a scoped low-opportunity decision, with timer granularity and observer overhead left explicit. This threshold budgets engineering effort; it is not a statistical whole-player no-benefit claim. A passing gate permits a candidate, never a performance verdict. Any candidate must pass decode-back and lifecycle before paired full-session cost runs. Invalid S24 precision must reject before FIFO publication and source overwrite must not affect retained samples.

## R47 single-piece owned batch

Primary metric: application gather-copy bytes per complete remux operation. Worthwhile threshold: at least 25% fewer gather-copy bytes on the admitted workload, with unchanged output, append count, source identity and lifecycle. The candidate may reuse a sole emitted Uint8Array only when it owns its entire non-shared ArrayBuffer. Multi-piece, partial-view and shared-buffer cases retain the existing gather. No claimed CPU or startup gain follows from allocation/copy counts. This bounded case avoids changing the consumer protocol or multi-piece assembly.

## Other queue items

R04/R34/R42 reuse the same emission/publication/append trace as opportunity evidence, without inheriting an R47 verdict. R27 separates code loading from mutable instances and needs actual compilation/instantiation evidence before a cache patch. R48 checks ordinary and unusually large browser-owned text tracks, overlap and backward seek; changing the complete public cue list requires an explicit contract and bounded ownership design. R09 compares eligible source-direct playback before adding another fMP4 parser. R72/R73 stop at the absent preview-service prerequisite. Missing source reports remain unresolved.

## Follow-up envelope

Separate R27 response body transfer from compilation. A research page may own one immutable compiled module for the exact served engine and clone it to fresh worker instances. Cold population is included, and repeated/concurrent owners must still present frames and terminate. This is attribution, not a production cache or a performance qualification. Reopen integration only if compilation remains a material repeated cost after the browser cache; small isolated milliseconds alone do not warrant a new lifecycle service. R01 records read wall time alongside duplicate ranges to bound the value of a future ownership handoff, without treating reads as physical disk I/O.

Resolve the recorded caption boundary and negative-DTS failure without relaxing production contracts. Summarize the existing larger-movie trace for R04/R34/R42. Extend the packed-PCM observer to the already available 30-second admitted S24 workload and retain the existing 5-percent effort gate and exact decode-back oracle.

### R74 follow-up candidate cost gate

After the long profile crossed the effort gate, the isolated packed-only candidate must pass exact decode-back, FIFO overwrite, invalid low-bit rejection and all nine lifecycle controls before cost sampling. Compare one warmup per variant and seven alternating pairs on the 30-second S24 fixture. Primary metric: complete open/play/EOF/destroy process-tree CPU seconds (harness, local server and Chrome descendants), minimum worthwhile reduction **5%**. Include destination playback; no hashing/capture inside the timed operation. Both engines retain the same stage observer. Save cumulative process snapshots, wall time and runtime counters. Exited processes can undercount CPU and must be reported. Warm loaded engine assets and the existing browser compile cache are explicit; this does not establish cold deployment cost. A paired uncertainty interval crossing 5% remains inconclusive and does not justify promoting a new default or starting release qualification.

### R27 bounded prototype startup screen

The separated hook and the one-module page prototype have both passed ten fresh-instance/output/cleanup checks. To close net-value attribution, compare one warmup and seven alternating pairs of those exact harness modes. Primary metric: sum of public open/play/destroy wall times for the complete suite (one cold player, two repeated players, two concurrent players), charging the candidate's initial module fetch/body/compile inside the cold operation. Minimum worthwhile reduction: **10%**. Each invocation owns a fresh Chrome profile; OS/file caching is warm and browser state is fresh. This is a startup suite, not sustained playback CPU. Report paired bootstrap uncertainty. A prototype signal cannot itself qualify a production module-retention/identity/cancellation owner.

The first R27 paired set compares the decomposed compile hook, not the maintained default streaming constructor. Its signal cannot qualify a survivor against the cheapest correct baseline. Repeat the identical declared 10% metric and seven-pair protocol with the **unchanged maintained worker** as reference (`MAINTAINED_BASELINE=1`); this second comparison controls the decision. Preserve both sets.
