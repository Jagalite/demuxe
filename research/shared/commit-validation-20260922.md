<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Remaining work commit validation, 2026-09-22

The commit includes Native startup recovery, component ownership labels, the
explicit component-study harnesses, audio-adaptation regression controls,
research metadata and compact captured evidence. Laboratory component routes
remain experimental; imported reports do not qualify new production routes.

## Executed checks

- `npm run build`: passed TypeScript, core dependency and license checks.
- `node tests/native-load-timeout.mjs`: nine Firefox cases passed, including
  local/remote distinctions, Matroska scheduling, gain, metadata preload,
  disabled remux, cancellation and cleanup.
- `node tests/native-load-restoration.mjs`: seven Chrome cases passed, covering
  missing or incompatible remux, full-budget restoration, bounded failure,
  cancellation, permissions and source identity.
- `node --test tests/runtime-capability-contracts.mjs tests/native-readiness-contracts.mjs tests/native-selection.mjs tests/head-to-head/contracts.mjs`:
  31 tests passed.
- `python3 tests/research-organization.py`: nine tests passed.
- `CASES=changed-identity,stale-generation node tests/audio-adaptation-lifecycle.mjs`:
  both source-identity and stale-generation controls passed.
- `node tests/head-to-head/component-extraction-checks.mjs build/head-to-head/assets-component-isolation-01`:
  the finite extraction and truncation controls passed using the existing asset
  snapshot. No new performance or general-media qualification is claimed.

## Historical integrity limitation

`python3 scripts/research.py verify` checked 436 item records and 988 archived
artifacts, retaining three declared historical hash mismatches. It reported 15
failure entries for 11 distinct mutable or removed source/runtime paths in
R006, R024, R176, R261 and R353. Each corresponding evidence-index entry was
already present, unchanged, in `ae2c7ff`. These are retained as failures in the
[verification output](research-verification-20260922.json); the old hashes and
historical records were not rewritten to make verification pass.

## Artifact availability

At the user's request, bulky raw artifacts stay in the original local checkout.
The [inventory](local-artifacts-20260922.json) records their byte identities;
specific ignore entries keep them out of this commit. This inventory is an
availability record, not an external backup. Original captured manifests remain
unchanged even when they reference a local-only file. Full historical integrity
checks and some benchmark reruns require those files to be restored; ordinary
source/build checks do not require the raw archive. Git LFS is not used.
The local inventory contains 3,229 files totaling about 3.15 GiB. The remaining
new source and evidence files total about 108 MiB before Git compression; no
individual new file exceeds 3 MiB. The license check and staged diff check pass.
