<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research batch 22: D86–D88

- D86: packet-correct intra-fragment interleaving still fails early A/V release on the tested endpoint.
- D87: independent partial audio/video SourceBuffers start one native-clock presentation before either tail arrives.
- D88: conditional append deduplication works only with correct timeline, residency, mutation-order and abort ownership.

Start with [REPORT.md](REPORT.md), then [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md). Machine-readable [ITEMS.json](ITEMS.json) and [verification](evidence/verification.json) describe the exact scope. This is not production code or a benchmark of maintained Demuxe.

Reproduce into a new directory:

```sh
python3 scripts/reproduce.py --out /tmp/demuxe-d86-d88-new-run
```

The experiments create synthetic files and launch installed headless Chromium. No network access is needed to replay. No repository write or media upload occurs. Do not run these restricted parsers as trusted parsers for arbitrary hostile files.
