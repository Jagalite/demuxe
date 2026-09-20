<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Range-fetch directly to a Matroska block inside a large Cluster

Full identity: `R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster`.

Current decision: **pursue** (actual-route screen).

Truthful CueRelativePosition into one genuine 3.65 MB VP9 Cluster passed exact source packet/timeline preservation, 30 independent full host and Chrome decoded pictures, malformed offset, changed ETag, missing RAP and in-flight cancellation controls. Nine alternating cold HTTP/header/Cues/parse/copy/temp-IVF/decode/close pairs saved median82.36% time (95%81.87–82.62%) and93.73% wire bytes against bounded prefix scanning. Prebuilt index preparation and WAN are excluded; source index generation was independently checked, no native Matroska support claimed.

Next action: Research profile complete. Consider authenticated index/provider integration only for genuine large Clusters; do not generalize to small-Cluster workloads.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Authored large Cluster with independently verified packets, timing and source-bound index; actual RangeReader and WebCodecs candidate. |
| screen | passed | Authored large Cluster with independently verified packets, timing and source-bound index; actual RangeReader and WebCodecs candidate. |
| correctness | passed | Truthful CueRelativePosition into one genuine 3.65 MB VP9 Cluster passed exact source packet/timeline preservation, 30 independent full host and Chrome decoded pictures, malformed offset, changed ETag, missing RAP and in-flight cancellation controls. Nine alternating cold HTTP/header/Cues/parse/copy/temp-IVF/decode/close pairs saved median82.36% time (95%81.87–82.62%) and93.73% wire bytes against bounded prefix scanning. Prebuilt index preparation and WAN are excluded; source index generation was independently checked, no native Matroska support claimed. |
| performance | passed | Truthful CueRelativePosition into one genuine 3.65 MB VP9 Cluster passed exact source packet/timeline preservation, 30 independent full host and Chrome decoded pictures, malformed offset, changed ETag, missing RAP and in-flight cancellation controls. Nine alternating cold HTTP/header/Cues/parse/copy/temp-IVF/decode/close pairs saved median82.36% time (95%81.87–82.62%) and93.73% wire bytes against bounded prefix scanning. Prebuilt index preparation and WAN are excluded; source index generation was independently checked, no native Matroska support claimed. |
| results | passed | Truthful CueRelativePosition into one genuine 3.65 MB VP9 Cluster passed exact source packet/timeline preservation, 30 independent full host and Chrome decoded pictures, malformed offset, changed ETag, missing RAP and in-flight cancellation controls. Nine alternating cold HTTP/header/Cues/parse/copy/temp-IVF/decode/close pairs saved median82.36% time (95%81.87–82.62%) and93.73% wire bytes against bounded prefix scanning. Prebuilt index preparation and WAN are excluded; source index generation was independently checked, no native Matroska support claimed. |
| decision | passed | Truthful CueRelativePosition into one genuine 3.65 MB VP9 Cluster passed exact source packet/timeline preservation, 30 independent full host and Chrome decoded pictures, malformed offset, changed ETag, missing RAP and in-flight cancellation controls. Nine alternating cold HTTP/header/Cues/parse/copy/temp-IVF/decode/close pairs saved median82.36% time (95%81.87–82.62%) and93.73% wire bytes against bounded prefix scanning. Prebuilt index preparation and WAN are excluded; source index generation was independently checked, no native Matroska support claimed. |

[New run](../../shared/runs/20260919T223155Z-relative-cue-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
