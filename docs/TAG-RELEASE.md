<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Tag-triggered release and deployment

Push a new tag containing [pages.yml](../.github/workflows/pages.yml) and its
helpers. The workflow performs the complete release sequence:

1. Install locked source/build dependencies and fetch the hash-pinned published
   `v0.3.0-beta.3-rc.5` comparison runtime.
2. Compile clean standard/private engines and the FLAC/Opus preparation engine.
3. Package the tagged npm runtime `.tgz` and corresponding source `.tar.gz`
   archives. All following checks use those exact bytes.
4. Assemble the current Pages player and test playback in Chromium and Firefox.
5. Generate synthetic release fixtures on the runner. The full correctness catalogue also
   downloads and validates the specialist samples.
6. Run the Chrome/Firefox archive consumers, streaming, Shaka, optional-runtime,
   public API/component/CLI tests, the complete correctness catalogue against both the
   published baseline and candidate, and the final release verifier.
7. Upload the qualified artifacts, then deploy Pages and publish a GitHub Release
   containing the runtime, source companions, hashes and verification evidence.
8. Stage the exact qualified archive on npm with the `beta` tag. Approve it in
   npm’s **Staged Packages** UI with 2FA to make it public.

The archive formats are `.tgz` and `.tar.gz`, not ZIP. No externally hosted
fixture bundle or manually uploaded release artifacts are required. The original
edge-case fixture is tracked in the repository; synthetic media is generated
from recorded recipes, and specialist bitstreams come from
`tests/head-to-head/specialist-sources.json`. External technical sample media and
raw decoded audio references are not attached to the release.

The catalogue covers every current README media row (80 today). The gate derives
coverage from the table and verifies matching fixture identities in both runs;
it does not hard-code 80. Added rows need corresponding fixture recipes. Missing
or duplicate coverage stops publication.

Each applicable fixture receives the standard correctness checks: initial and
moving output, audio/subtitles, pause/resume, playback-rate progression, forward
and backward seeks, near-EOF and cleanup. Live streams use bounded progression
checks. Existing unsupported/blocked cases stay explicit and are compared with
the baseline; inclusion alone is not a passing output claim.

The catalogue runs once per fixture per release version: published baseline and
candidate. It does not pass `--performance`, so there are no CPU benchmark rounds
or 5-second warmup / 20-second measurement windows. Mini/smoke profiles are not
part of release qualification. Archive, streaming, optional-runtime and clean
source/build checks remain required.

Qualification limits remain explicit; generating media or downloading a sample does not count as a passing
browser test. Any missing input, changed pinned download, build error,
qualification failure or archive mismatch stops release publication and npm
staging. The catalogue continues to compare baseline/candidate behavior with the
same browser and fixture bytes. Current subtitle-service hashes are checked as
standard engine artifacts; the removed standalone ASS engine is not required.

Use a new prerelease version in `package.json` for changed npm archive bytes.
An RC tag can identify that package version, but must point at the clean source
recorded in its manifest. Stable npm versions remain outside this beta policy.
Tag updates/deletions do not deploy. A manual workflow dispatch rebuilds Pages
for an existing tag without creating a release or staging npm.

## Repository setup

Use GitHub Actions for Pages. Permit release tags in the `github-pages` and
`npm` environments. Configure the npm trusted publisher for `Jagalite/demuxe`,
workflow `pages.yml`, environment `npm`, with **direct publishing unchecked**;
see [npm setup](NPM-PUBLISHING.md). No npm token or extra fixture storage is needed.

The release job alone has `contents: write`. The staging job alone has npm OIDC
permission. Staging is chained directly to release creation because a release
created using the workflow's `GITHUB_TOKEN` does not start another Actions run.
The `release: published` trigger remains available for manually prepared verified
releases.

## Failures and retries

All qualification must pass before publishing a release. Uploads first go to a
draft; publication happens after every file is attached. On a release-job retry,
existing assets must match byte-for-byte; different assets are never overwritten.
An incomplete published release is not silently modified.

A pending npm stage requires UI review; staging retries cannot approve, reject or
replace it. After approval, a rerun verifies the existing public archive integrity
and exits without restaging. Pages and GitHub publication have separate job
statuses, so a deployment-service error may require rerunning its failed job.

## Validation boundary

Local guard tests cover archive validation, stale result rejection, pipeline
failure propagation, draft/upload ordering and npm staging. A synthetic fixture
preparation run is separate from browser qualification. The full clean Linux
engine build and tag-to-deployment run must still pass in Actions; local guard
tests do not establish that end-to-end result. No release or npm version is
created by those local tests.
