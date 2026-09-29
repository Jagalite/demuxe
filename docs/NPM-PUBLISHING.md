<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Staging verified GitHub Releases for npm approval

A new pushed tag starts the [complete release pipeline](TAG-RELEASE.md) in
[pages.yml](../.github/workflows/pages.yml). GitHub Actions builds the engines,
generates/downloads the test fixtures, qualifies the exact runtime and source
archives, deploys Pages, publishes a GitHub Release and stages its archive on
npm. The npm version becomes public only after your approval with 2FA.
A main merge or manual Pages rebuild does not stage npm. The release tag must
contain the workflow, publishing helpers and tests.

The npm job also supports `release: published` for a manually prepared verified
release. In that case, complete [release qualification](RELEASE.md) first and
attach the runtime `.tgz`, all matching `*source*.tar.gz` companions,
`verification.json`, clean build record, `SHA256SUMS` and qualification evidence
to the draft before publishing it. Tag automation supplies these files itself.

The handoff checks the verification status, required suite records, runtime and
source SHA-256 hashes, runtime inventory, optional companion hashes, and the
resolved tag commit. RC tag names may differ from the npm package version, as in
previous releases; the recorded tag and commit must match exactly. It does not
rerun the full catalogue or turn the Pages development archive into a qualified
release. Publishing a release is the maintainer's attestation that its verification
record was produced by the release gates.

Only a non-private `demuxe` prerelease version is accepted. The job uses
`npm stage publish <verified archive> --tag beta --access public --ignore-scripts --provenance`;
it never publishes the private repository root or rebuilds the archive.
Stable versions need a separate release policy and are rejected. `latest` is not
updated. Staging success means awaiting approval, not publicly published.
The job ends after staging; it does not poll the public registry for a version
that is still private. An already public version is checked against the archive's
SHA-512 integrity: identical bytes are a successful no-op without changing
dist-tags, while conflicting bytes fail. Keep a new package version for each
new archive.

## Approving a version

Open npm's **Staged Packages** tab, review the package version, provenance and
`beta` tag, click **Approve**, and complete 2FA. Approval publishes the staged
version. See [npm staged publishing](https://docs.npmjs.com/staged-publishing/).
The workflow cannot approve or reject versions on your behalf.

A rerun while a version is already staged may fail with a version conflict.
OIDC credentials cannot use `npm stage list`, `view`, `download`, `approve` or
`reject`, so the job does not attempt to inspect or replace a pending stage.
Review the existing entry in the UI; approve the intended archive, or reject it
before retrying if it is wrong. Never enable direct publishing to bypass this.
After approval, rerunning the job verifies the public version's integrity and
exits without restaging. Complete the post-publication consumer smoke checks
in [the release procedure](RELEASE.md).

## One-time npm setup

An owner of the existing `demuxe` npm package must configure a GitHub Actions
trusted publisher in its npm settings:

| Setting | Value |
| --- | --- |
| Organization or user | `Jagalite` |
| Repository | `demuxe` |
| Workflow filename | `pages.yml` |
| Environment | `npm` |
| Permission | Staging only; leave direct publishing unchecked |

The job uses a GitHub-hosted Ubuntu runner, Node 24, npm 11.15.0 and
`id-token: write`. No long-lived `NPM_TOKEN` secret is needed. New trusted
publisher configurations default to staging permission. Leave direct publishing
unchecked; if it was previously enabled, disable it in npm package settings. See the [npm trusted publisher documentation](https://docs.npmjs.com/trusted-publishers/).

Alternatively, from an authenticated npm account with package write access and
2FA, use the [npm trust CLI](https://docs.npmjs.com/cli/v11/commands/npm-trust/):

```sh
npm exec --yes --package=npm@11.15.0 -- npm trust github demuxe \
  --file pages.yml --repo Jagalite/demuxe --environment npm --allow-publish=false --allow-stage-publish --yes
```

Ensure any deployment restrictions on the GitHub `npm` environment permit the
release tags. Configure the trusted publisher before publishing the release.
If authentication or assets are missing, the npm job fails. Once corrected,
rerun the failed job, checking for a pending stage first. Editing
release assets does not itself trigger publication. Pages deployment is independent.

## Local validation

```sh
python3 tests/npm-release.py
python3 scripts/publish-npm-release.py --assets build/release \
  --tag <release-tag> --commit <resolved-tag-commit>
```

Validation is the default; only `--stage` contacts npm and submits a pending version. The tests
use synthetic archives and mocked registry/publish calls. They cover changed
archives, mismatched refs, missing qualification, unsafe names, inventory changes,
dirty source, stable versions, conflicting npm versions and staging failures without a direct-publish fallback.
They do not publish or substitute for native/browser release qualification.
