<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Research artifact storage

Git retains the research decisions, reports, recorded measurements, source and
harnesses, provenance, licenses, commands, and immutable evidence manifests.
Generated bulk artifacts listed in `reproducible-artifacts.json` are omitted
from Git and ignored by exact path in `.gitignore`. Existing local copies remain
untouched. No previously tracked artifacts are removed by this policy.

The inventory records each omitted file's original SHA-256, size, reason, and
recovery references. Follow those references to rebuild runtimes or regenerate
fixtures and reference payloads with the recorded inputs and toolchain. Recovery
references are instructions, not a claim that a clean-machine rerun was tested.
Use a new run directory for new experiments; never overwrite historical results.
Builds or regenerated outputs can differ across toolchain versions. A differing
hash is a new artifact, not verification of the old one.

Observed timing samples, browser traces, physical-device captures, and uncertain
source inputs are retained. A rerun cannot recreate the historical observation.
Original manifests and history retain their original identities and are not
rewritten to disguise missing bulk files.

`python3 research/shared/tooling/verify-research-runs.py` verifies full local
artifact identities. A fresh clone intentionally lacks the listed bulk files;
that verifier reports them missing until restored. The recorded campaign audit
predates storage exclusions and describes the complete local evidence set at
that time, not a fresh-clone verification. This checkout also relies on existing
external toolchains and archived sources documented by the individual runs.

Some historical manifests reference production paths that later commits changed.
The [source-drift audit](shared/runs/20260920T042500Z-historical-source-drift/analysis.md)
recovers the exact original bytes from Git without rewriting old manifests or
current source. The live-path verifier continues to report those differences;
the audit maps each to its byte-verified historical snapshot.
