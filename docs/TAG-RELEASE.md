<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Tag-triggered beta release and deployment

Push a new tag containing [pages.yml](../.github/workflows/pages.yml) and its
helpers. The beta workflow runs builds, archive integrity checks and publication:

1. Install locked source/build dependencies.
2. Compile clean standard/private engines and the FLAC/Opus preparation engine.
3. Package the tagged npm runtime `.tgz` and corresponding source `.tar.gz`
   archives, preserving source correspondence, licenses and engine build hashes.
4. Write `verification.json` with status `developer-beta-build-only`, the exact
   archive and clean build record hashes, and an explicit skipped qualification notice.
5. Assemble the current Pages player and matching source downloads.
6. Upload the beta artifacts, deploy Pages and publish a GitHub prerelease.
7. Stage the same archive on npm with the `beta` tag. Approve it in npm’s
   **Staged Packages** UI with 2FA to make it public.

Beta CI skips test suites: Pages browser playback, installed archive consumers,
streaming, Shaka, public API/component/menu checks, optional-runtime qualification,
fixture generation and the full baseline/candidate catalogue comparison. It also
skips synthetic guard tests. These tests remain available for local checks;
`scripts/tag-release.py baseline` and `qualify --tag <tag>` retain the complete
qualification path. Build-only publication does not assert browser correctness,
passing catalogue coverage, performance or production qualification.

Build errors, dirty or mismatched tagged source, missing source companions,
changed pinned downloads and archive/build hash mismatches still stop publication.
Build-only publication is restricted to beta package versions. Fully tested
records remain supported and must retain their original complete qualification.

Use a new prerelease version in `package.json` for changed npm archive bytes.
An RC tag can identify that beta package version, but must point at the clean
source recorded in its manifest. Stable npm versions remain outside this policy.
Tag updates/deletions do not deploy. A manual workflow dispatch rebuilds Pages
for an existing tag without creating a release or staging npm.

## Repository setup

Use GitHub Actions for Pages. Permit release tags in the `github-pages` and
`npm` environments. Configure the npm trusted publisher for `Jagalite/demuxe`,
workflow `pages.yml`, environment `npm`, with **direct publishing unchecked**;
see [npm setup](NPM-PUBLISHING.md). No npm token or fixture storage is needed.

The release job alone has `contents: write`. The staging job alone has npm OIDC
permission. Staging is chained directly to release creation because a release
created using the workflow's `GITHUB_TOKEN` does not start another Actions run.
The `release: published` trigger remains available for manually prepared beta
releases with valid verification records.

## Failures and retries

Uploads first go to a draft; publication happens after every file is attached.
On a release-job retry, existing assets must match byte-for-byte; different
assets are never overwritten. An incomplete published release is not silently modified.

A pending npm stage requires UI review; staging retries cannot approve, reject or
replace it. After approval, a rerun verifies the existing public archive integrity
and exits without restaging. Pages and GitHub publication have separate job
statuses, so a deployment-service error may require rerunning its failed job.

## Local qualification

The full catalogue remains an opt-in correctness check against identical fixtures
for the pinned published baseline and candidate. Coverage follows the README
media table; unsupported and blocked cases remain explicit. No CPU benchmark
rounds run unless separately requested. See [release checks](RELEASE.md) for the
complete qualification commands.

Local guard tests cover archive validation, both build-only and tested handoffs,
draft/upload ordering and npm staging. They do not compile engines or publish
anything. The clean Linux build and tag-to-publication sequence still need to
complete in Actions to establish that end-to-end result.
