<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact-frame dependency slicing

Full identity: `R132.exact-frame-dependency-slicing`.

Current decision: **stop_current_profile** (actual_host_and_browser_component).

A real prepared AV1 dependency graph reduces the exact-target prefix from54 packets to4, preserving all selected full pictures and original timestamps in independent host and Chrome decoders. Omitting a necessary reference fails. Seven alternating cold comparisons charge actual header-certificate acquisition; acquisition plus decode alone is6.879 times baseline at the median (all pairs regress), before graph construction/serialization. Stop this cold seek profile; no claim against amortized trusted indexes or arbitrary coded-block slicing.

Next action: Reopen with an amortized authenticated dependency certificate; retain source/config/epoch identity and required header-state dependencies.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Real AV1 reference-slot graph derived from source headers; conservative transitive closure implemented. |
| screen | passed | 54-to4 packet opportunity demonstrated on prepared independent reference banks. |
| correctness | passed | Independent host and browser full output+PTS exact; missing-reference negative fails; output and decoders closed. |
| performance | failed | Cold acquisition+decode lower bound median6.879x prefix baseline, minimum3.486x across7 pairs. |
| results | passed | A real prepared AV1 dependency graph reduces the exact-target prefix from54 packets to4, preserving all selected full pictures and original timestamps in independent host and Chrome decoders. Omitting a necessary reference fails. Seven alternating cold comparisons charge actual header-certificate acquisition; acquisition plus decode alone is6.879 times baseline at the median (all pairs regress), before graph construction/serialization. Stop this cold seek profile; no claim against amortized trusted indexes or arbitrary coded-block slicing. |
| decision | passed | A real prepared AV1 dependency graph reduces the exact-target prefix from54 packets to4, preserving all selected full pictures and original timestamps in independent host and Chrome decoders. Omitting a necessary reference fails. Seven alternating cold comparisons charge actual header-certificate acquisition; acquisition plus decode alone is6.879 times baseline at the median (all pairs regress), before graph construction/serialization. Stop this cold seek profile; no claim against amortized trusted indexes or arbitrary coded-block slicing. |

[New run](../../shared/runs/20260919T233127Z-av1-dependency-slice/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
