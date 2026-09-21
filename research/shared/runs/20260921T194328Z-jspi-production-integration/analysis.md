<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Production integration and review fixes

Production integrated (scoped): the maintained public Player automatically uses the no-pthread JSPI runtime on non-isolated origins for finite single-video AVC / single-audio AAC MPEG-TS. Builds, inspection, bounded source reads, cancellation, seeking, source replacement, packaging and exact-archive release gates are integrated. Eleven non-isolated Chrome checks pass, including exact decoded pixels/PCM and cancellation after an observed pending Wasm read with an initialization-only negative control. Isolated pthread regressions and missing-JSPI rejection pass. Local working-tree implementation; no commit, deployment or release publication is claimed.

The Bash 3.2 empty-array/nounset build failure is fixed, and both build profiles were executed. Cancellation now waits for a real Wasm source-read request and withholds its response before closing; the negative control deliberately withholds init and must fail to reach that barrier. The isolated test mailbox proxy mirrors the actual owner cancellation flag; its initial missing forwarding failure is retained as test-harness evidence. The research verifier also now accepts the existing preview campaign keyed membership records. Earlier runs that only observed init remain historical evidence and do not establish suspended-read cancellation.

Research disposition: already_implemented. Integration: production_integrated, restricted to the documented AVC/AAC MPEG-TS profile. Release: not_released. Historical component performance evidence remains unchanged; this run makes no comparative performance, Safari/mobile, physical-output or long-session endurance claim.

Maintain the production regression suite and complete normal clean-source release gates before publishing. Reopen broader containers/codecs only with their own timing, priming, output and lifecycle qualification. No whole-player speed improvement is claimed.

See results.json for browser versions, archive hashes and immutable result locations; files/ preserves the implementation, harness and both runtime binaries. The binary package was made in a temporary validation snapshot to exclude unrelated existing experimental SPDX errors; its synthetic snapshot commit does not establish clean-source correspondence. Existing unrelated work was preserved.
