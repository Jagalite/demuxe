<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# one SourceBuffer, different codec and container

Current decision: **pursue**. One SourceBuffer crosses AVC/fMP4 to VP9/WebM with every24frame query exactly matching independent isolated native presentations. Continuous playback delivers the remaining23frames with exact hashes and timeline. Stale generation rejects; fatal bad second init explicitly requires rebuild. Qualified local transition benchmark shows22.55% median savings.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | One SourceBuffer crosses AVC/fMP4 to VP9/WebM with every24frame query exactly matching independent isolated native presentations. Continuous playback delivers the remaining23frames with exact hashes and timeline. Stale generation rejects; fatal bad second init explicitly requires rebuild. Qualified local transition benchmark shows22.55% median savings. |
| correctness | passed | Exact original report video-only scope: two1s160x96@12fps changing-picture streams,24 complete RGBA frame hashes equal isolated baseline at frame centers, reverse/forward queries, one retained SourceBuffer. Continuous playback23subsequent frames exact plus independently queried initialframe, timestamps0.083333..1.917,EOF. Stale callback after replacement rejected; actual wrong-container second init errors, declared full rebuild restores old frame. No claim old SourceBuffer can roll back fatal parse errors; URLs/elements released. Audio,gapless A/V and production queue ownership excluded. |
| performance | passed | Predeclared11 alternating fresh-owner pairs after correctness; old source opened and firstframe established before measured transition. Candidate changeType+append versus restart/reappend, through full-frame capture/hash and cleanup. Resident identical encoded bytes common; no network/browser startup saving claimed. Median saving22.5457%, deterministic bootstrap95 median[15.6185%,41.2366%],5% gate passed. Prior rAF-quantized run retained/excluded with explicit measurement correction. No CPU, physical memory or energy claim. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: One SourceBuffer crosses AVC/fMP4 to VP9/WebM with every24frame query exactly matching independent isolated native presentations. Continuous playback delivers the remaining23frames with exact hashes and timeline. Stale generation rejects; fatal bad second init explicitly requires rebuild. Qualified local transition benchmark shows22.55% median savings. |

Next/reopen: Pursue bounded video-only component. Production adoption needs actual queue/generation owner integration and selected-audio sample-boundary tests; preserve mandatory rebuild on fatal parser errors. No routing changes.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
