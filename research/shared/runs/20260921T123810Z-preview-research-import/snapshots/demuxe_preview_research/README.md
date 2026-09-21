<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe: progressive and reduced-decode preview research

**Decision: pursue tiered preview delivery; retain selective video reconstruction as an optional, narrowly gated experiment.**

This is an executed **component-research package**, not a production preview implementation or a browser performance qualification. Seven native component screens were completed. A browser probe was blocked before any codec tests ran.

Proposed stable key: `preview.progressive-independent-extraction`. This key is **not registered in the repository**. Resolve the current canonical item home before importing; do not allocate a new R-number based on this export.

Repository metadata/process inspected at `b4fa9ec1e7b86c2768aa5cb220d451d1b54432c7`, main commit dated 2026-09-21T02:56:12Z. No remote files, issues, branches, or defaults were changed. Repository code was not cloned or executed. These harnesses are independent of Demuxe.

## Read first

[Research report](RESEARCH.md) contains methods, results, interpretation, exclusions, and the path decision. [Local-agent handoff](LOCAL_AGENT.md) continues only the unresolved browser and decoder questions. [Reproduction guide](REPRODUCE.md) explains how to run the included scripts without overwriting the original evidence. `item.json` and `history.jsonl` provide a proposed research record based on the repository's template. `sources.json` provides primary references; `manifest.json` hashes the export.

## Main findings

| Question | Observed result | Decision |
|---|---|---|
| Does FFmpeg's ordinary low-resolution option solve modern-video thumbnails? | In this installed build H.264, HEVC, VP9 and AV1 remained full-size; JPEG and MPEG-2 actually reduced decoded dimensions. | Reject the universal-flag shortcut, not all reduced-decode research. |
| Can packet selection remove unnecessary video work? | Selected VP9 key packets gave the same three thumbnails in 96.5 ms vs 763.0 ms for full-file decode and selection. | Pursue indexed independent extraction; do not call this a win over optimized hardware random access. |
| Can a coarse result precede an exact one? | H.264 IDR at 2 s: 74.7 ms; optimized exact seek to 3.5 s: 234.0 ms. Both matched their own represented timestamps. | Pursue optional temporal refinement, with accurate metadata. |
| Can compressed-domain reconstruction be tested independently? | A seven-output 4×4 transform kernel matched seven million residual-boundary checks per build; 1.32–1.75× faster than our full C kernel depending on build flags. | Mechanism worth a scoped decoder experiment; not a complete thumbnail decoder or a comparison against FFmpeg SIMD. |
| Does decoder-scaled JPEG help? | 4.48–11.93× faster than full decode and resize on two synthetic 4K JPEG fixtures, with SSIM 0.9948–0.9971. | Positive codec-specific component evidence; not an H.264/HEVC result. |
| Does genuinely resumable refinement work? | Native progressive JPEG first/final passes reused decoder state; final pixels matched one-pass final decode. First output was earlier but finishing both passes cost 16–25% more total time. | Useful optional authored-image path, not a universal video feature. |
| Is pre-authoring still competitive? | Small pixel-exact PNG thumbnails decoded in 0.33–0.79 ms. Their preparation/storage/transfer were excluded. | Always retain authored and cached providers. |

All times are environment-specific native measurements. Consult the report before comparing rows: these are **different workloads**, not a single benchmark leaderboard.

The inexpensive production direction is: **use available authored/cached previews; otherwise decode a qualified random-access sample independently; refine toward the requested frame only when useful.** A custom partial video decoder can later plug into that sequence—or be removed—without changing the controller contract.
