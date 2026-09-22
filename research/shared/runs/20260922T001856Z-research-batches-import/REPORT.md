<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Research batch import

Imported focused batch 22 (D86–D88) and the ecosystem expansion (EB01–EB22), preserving all supplied file bytes.

Archive: 1456 files; all 1455 declared SHA-256 entries verified, with complete coverage except the checksum file itself. ZIP paths and file types checked before extraction. The standalone Markdown matches the attachment byte for byte. Input hashes, sizes and all snapshot hashes are in [manifest.json](manifest.json).

External component screens imported without rerunning experiments; current decisions and stages unchanged. No production or performance qualification inferred.

Batch 22 reports 92/92 checks; this is an imported result, not a local replay. Retained corrections and failed variants remain in the snapshot. The ecosystem report is source review only and its proposed canonical mappings remain pending. All supplied fixtures and replay outputs are retained; no linked companion package was supplied or downloaded. Existing item metadata and unrelated workspace edits are preserved.

## Local validation

All 1,457 snapshot files were rehashed after import; campaign links, `git diff --check -- research`, and `python3 scripts/check-licenses.py` passed. `python3 scripts/research.py verify` completed with 14 existing evidence mismatch reports across 10 paths outside this import (JSPI tooling/runtime and production web assets); see run.json. No imported artifact mismatch or campaign membership failure was reported. Those existing evidence records were not changed to hide drift.
