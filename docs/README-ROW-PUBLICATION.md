<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Publishing a completed README row

`tests/head-to-head/report-refresh-row.py` verifies completed correctness and CPU manifests, prepares compact evidence, and updates a row only with `--apply`. Supply the final corrected campaigns explicitly; earlier attempts remain untouched.

Use one or more `--correctness` directories covering Auto, Software, JSPI, Asyncify and all four nonisolated Hybrid/Software × JSPI/Asyncify lanes. Streaming rows require the two applicable Auto/Software cases; file-only lanes are recorded as N/A. Unknown lanes and mixed fixture/browser snapshots fail.

Each CPU case must match its selected correctness campaign's assets, browser identity and captured harness hash. Three accepted rounds are required for a published median. Failed gates publish CPU withheld; incomplete main-lane measurements prevent application. Nonisolated observations stay in the row report and do not replace the four main README cells.

Prepare with `--row N --correctness DIR [--correctness DIR] --cpu DIR --output build/ROW-DRAFT --publish-to results/head-to-head/readme-refresh-20261001/row-NN`. Review the proposed row and receipt, then repeat using a fresh draft path and `--apply`.

Evidence contains deterministic gzip copies of full summaries, original captured manifests, captured source harness archives and a compact receipt. It excludes media, Wasm, screenshots and runtime archives. Commit the completed row's evidence and report together; commit and push are separate commands and are not performed by the publisher.
