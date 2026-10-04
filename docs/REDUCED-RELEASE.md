# Explicit reduced-scope prerelease publication

A `reduced-*` prerelease is a separate publication policy. It does not produce
`verification.json`, claim a complete codec catalogue, or replace the existing
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
incomplete, failed or source-mutating runs are rejected.

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
Stable package versions and mismatched or duplicated RC suffixes are rejected.
