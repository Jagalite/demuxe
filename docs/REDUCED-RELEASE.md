# Explicit reduced-scope publication

The `reduced-*` path defaults to prerelease publication, with a separate explicit
stable opt-in described below. Neither policy produces
`verification.json`, claims a complete codec catalogue, or replaces the existing
full qualification verifier. Use this path only when the release scope and
remaining uncertainty have been explicitly accepted.

The new validator and publisher are archive assembly/publication tools. They do
not compile or alter native engines. Every one of the original 263 native input
hashes, generated configuration hashes, SDK source hashes, native artifact hashes,
and the original native build record must still match. Existing full publishers
and their recorded source bytes remain unchanged. New publication tools are
bound to the candidate Git tree and corresponding source archive.

`reduced-qualification.json` must identify the exact candidate commit, a tag such
as `reduced-v1.0.0-rc.1` (for package `1.0.0-rc.1`), runtime and corresponding source archives, and a
complete reduced gate. All 15 rows are required: component, keyboard-seek and
timeline tests in Chrome, Firefox and WebKit; the three-browser local player;
Chrome and Firefox independent consumers; CLI asset copying; and Chrome and
Firefox audio-tail checks. Row logs and terminal reports are attached and
hash-checked, with exact case identities where reports provide them. Retried,
incomplete or source-mutating runs are rejected. Failed runs are rejected by the
default prerelease policy; the stable-only [accepted cleanup recurrence](#accepted-chrome-cleanup-recurrence)
policy below admits exactly one documented failure signature.

The receipt declares the deferred complete catalogue, full optional matrix,
full streaming/Shaka matrix, CPU/performance and long-duration physical AV work.
It records the accepted, unresolved historical Chrome worker teardown finding.
`fullReleaseQualified` must be false. Release notes must be the exact committed
candidate document; measured final outcomes belong in the attached receipt.

Runtime files, native artifacts, installed-package correspondence, main source
inventory, tagged source bytes, SDK/build materials and optional source companion
hashes are verified independently of the gate's success flags. Ordinary web
assets and generated JavaScript must match tagged source. Public entrypoint
facades and package metadata must match the maintained package assembly policy;
CLI code must match tagged source. Historical unpreserved `results/` entries are
excluded from the source-tree walk by the existing source-packager policy.

Prepare a fresh assets directory containing the runtime archive, all matching
source companions and the reduced receipt. Gate status, bindings, controller,
installed manifest, native correspondence, release notes, logs and reports must
use `reduced-` filenames. The receipt maps original report paths to these portable
assets. Validation is the default and has no publication side effects:

```sh
python3 scripts/publish-reduced-release.py --assets PATH \
  --tag reduced-v0.3.0-beta.6-rc.1 --commit FULL_COMMIT
```

After validation, `--github --repo OWNER/REPO` checks that the remote tag resolves
to the validated commit, creates or completes a draft with identical assets, and
publishes a prerelease. It refuses conflicting assets or mutation of an incomplete
published release. It does not create or push tags.

A pushed `reduced-*` tag does not start the full Pages/native rebuild. The published
GitHub Release event still enters the existing trusted npm staging job. That job
selects the reduced validator only for this prefix; all other tags keep the full
validator. `--stage` uses the existing npm staged-publication mechanism, with no
fallback to direct publication. Registry integrity conflicts fail, and npm's
maintainer approval requirement remains in effect. This path does not deploy Pages.

The schema-1 receipt status `reduced-developer-beta-tested` remains unchanged for
compatibility; it identifies reduced prerelease qualification, not a stable-release
claim. Canonical tags are `reduced-v` followed by the exact prerelease package
version. Legacy beta tags such as `reduced-v0.3.0-beta.6-rc.1` remain accepted.
The default prerelease policy rejects stable package versions and mismatched or
duplicated RC suffixes. Stable versions require the separate explicit policy below.

## Explicit stable semantic-version promotion

Stable `1.0.0` is a separate opt-in policy, not an RC receipt relabel. Use the exact
`reduced-v1.0.0` tag and a fresh, source-bound receipt with status
`reduced-stable-tested`. The publisher requires `--stable` for validation,
GitHub publication, and npm staging; without it stable versions remain rejected.
The existing prerelease policy and full verification tools are unchanged.

All archive, tagged-source, native-input, companion, and fifteen exact gate-row
checks remain mandatory, as do `fullReleaseQualified:false`, deferred suites, and
the accepted historical Chrome uncertainty. Stable SemVer does not claim full
qualification: the maintained packager's `beta-candidate-not-production-qualified`
status and `qualification.production:false` remain intact as historical packaging
and full-qualification descriptors. They are explicitly checked for this policy.
The stable release notes must disclose the reduced scope and unresolved history.

After exact stable assets pass validation, `--github --stable` creates/publishes a
non-prerelease GitHub release with latest enabled. It never converts an existing
published prerelease into stable. The published-release workflow supplies
`--stable` only for a canonical stable reduced tag on a non-prerelease release;
the receipt and archive must independently agree. npm still uses trusted staged
publication with provenance and maintainer approval, with no direct publish
fallback. No RC archive, receipt, or tag is modified or reused as stable evidence.

### Accepted Chrome cleanup recurrence

Only the explicit stable policy can admit the accepted Chrome teardown finding.
The raw gate, row, and consumer report keep `passed:false`; the stable receipt
instead records `releaseEligible:true` and `acceptedGateFailures`. On an entirely
green gate the latter is empty. `derive_stable_eligibility` derives this metadata
from the gate and hash-indexed reports; the publication validator recomputes it
from the attached immutable evidence. An assembler must not rewrite test outcomes.

Admission is limited to one failed `consumer-chrome` row and its exact
`bundled application at /deep/runtime-v2/` case. The other fourteen groups and
seven consumer cases must pass, preservation must succeed, and there must be
exactly one attempt, not a retry. The original destroy assertion must report one
remaining local `software-full-engine-worker.js`: sixty creations, fifty-nine
closures with the same surviving identity, closed viewer iframe/audio context,
zero connected iframes, and a matching still-reported CDP worker whose probe timed
out. Missing diagnostics, different failures, page/request errors, another worker,
additional attempts, or any Firefox failure are rejected. The accepted descriptor
binds the source, archive, row, case, report hash, and observed worker identity.

This is documented release eligibility despite a known failed test, never an
all-tests-passed claim or a teardown fix. Prerelease and full qualification paths
continue to require their original passing evidence.
