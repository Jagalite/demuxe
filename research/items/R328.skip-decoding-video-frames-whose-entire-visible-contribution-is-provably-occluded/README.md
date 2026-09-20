<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Skip decoding video frames whose entire visible contribution is provably occluded

Full identity: `R328.skip-decoding-video-frames-whose-entire-visible-contribution-is-provably-occluded`.

Current decision: **stop_current_profile** (actual_host_and_browser_component).

Actual prepared AV1 no-refresh/error-resilient intra-only picture is omitted under source-bound full-frame opaque coverage, while hidden original reference-building picture remains. Independent host later reconstruction and all3 declared composed sample planes/timestamps are exact in Chrome; decoded outputs fall3to2. Covered reference, partial alpha, partial region and wrong source reject. Seven fresh-decoder paired jobs charge actual header certificate acquisition; cost lower bound median11.786x ordinary decode (all pairs regress). Stop cold profile; no arbitrary codec entropy-state skipping or amortized-index claim.

Next action: Reopen only with already-authenticated reusable dependency/coverage certificates or a larger eligible covered workload; never infer full opacity from approximate visibility.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Real prepared source and decoded source-bound coverage/eligibility certificates. |
| screen | passed | Actual decoder omits one nonreference picture while retaining all later required state. |
| correctness | passed | Full declared output and later references exact; reference/alpha/region/source negative guards reject and all decoder frames close. |
| performance | failed | Cold acquisition+decode lower bound median11.786x; every ratio2.918–17.356x regresses. |
| results | passed | Actual prepared AV1 no-refresh/error-resilient intra-only picture is omitted under source-bound full-frame opaque coverage, while hidden original reference-building picture remains. Independent host later reconstruction and all3 declared composed sample planes/timestamps are exact in Chrome; decoded outputs fall3to2. Covered reference, partial alpha, partial region and wrong source reject. Seven fresh-decoder paired jobs charge actual header certificate acquisition; cost lower bound median11.786x ordinary decode (all pairs regress). Stop cold profile; no arbitrary codec entropy-state skipping or amortized-index claim. |
| decision | passed | Actual prepared AV1 no-refresh/error-resilient intra-only picture is omitted under source-bound full-frame opaque coverage, while hidden original reference-building picture remains. Independent host later reconstruction and all3 declared composed sample planes/timestamps are exact in Chrome; decoded outputs fall3to2. Covered reference, partial alpha, partial region and wrong source reject. Seven fresh-decoder paired jobs charge actual header certificate acquisition; cost lower bound median11.786x ordinary decode (all pairs regress). Stop cold profile; no arbitrary codec entropy-state skipping or amortized-index claim. |

[New run](../../shared/runs/20260919T234344Z-opaque-av1-skip/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
