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
   published baseline and candidate, and the final release verifier. Boundary
   checks require all 19 scenarios in Chromium, Firefox and WebKit on independent
   installations of the archive. All six maintained API shards must also pass
   in Chromium and Firefox on that same archive before artifacts are uploaded.
7. Upload the qualified artifacts, then deploy Pages and publish a GitHub Release
   containing the runtime, source companions, hashes and verification evidence.
8. Stage the exact qualified archive on npm with the `latest` tag. Approve it in
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

A completed catalogue run can exit nonzero because it contains blocked or failed
screens. The wrapper accepts that exit only with a fresh, finalized, complete
report whose counts, identities and completion hash agree. The comparison still
rejects regressions and changed limitations. Missing or partial output, skipped
cases, crashes and inconsistent exit statuses stop the release sequence.
The full correctness runner also stops with a distinct failure if no browser
identity or no successful playback screen was observed, preventing an entirely
unobserved catalogue from being treated as unchanged limitations.

The catalogue runs once per fixture per release version: published baseline and
candidate. It does not pass `--performance`, so there are no CPU benchmark rounds
or 5-second warmup / 20-second measurement windows. Mini/smoke profiles are not
part of release qualification. Archive, streaming, optional-runtime and clean
source/build checks remain required.

Endurance campaigns are also outside the publication gate. Performance and
endurance runs are optional investigations selected according to the change;
neither is required to produce the release verification record or publish the
qualified archive. Retain any such results separately with their tested revision
and archive identity. This does not waive the exact-archive functional checks.

Qualification limits remain explicit; generating media or downloading a sample does not count as a passing
browser test. Any missing input, changed pinned download, build error,
qualification failure or archive mismatch stops release publication and npm
staging. The catalogue continues to compare baseline/candidate behavior with the
same browser and fixture bytes. Current subtitle-service hashes are checked as
standard engine artifacts; the removed standalone ASS engine is not required.

Use a new version in `package.json` for changed npm archive bytes.
An RC tag can identify that package version, but must point at the clean source
recorded in its manifest. Stable versions use the matching `v<version>` tag (for example, `v1.1.0`).
The same exact-archive gates apply to stable releases. GitHub marks a qualified
stable release as latest; prerelease package versions remain GitHub prereleases.
Tag updates/deletions do not deploy. A manual workflow dispatch rebuilds Pages
for an existing tag without creating a release or staging npm.

## Qualify an unpublished candidate

Before dispatching a full build, install the locked dependencies and run the
browser receipt preflight:

```sh
npm ci --ignore-scripts
node --test tests/release-browser-contracts.test.mjs
```

This checks the installed Playwright pin and rejects incomplete or failed
browser receipts. The API case minimum is shared with the normal API gate, so
adding a case does not require updating a second exact count. Both PR CI and
the release build run this preflight before expensive compilation.

On macOS, a retained candidate archive can exercise the complete Apple WebKit
wrapper before another full build:

```sh
npx playwright install webkit
node tests/api-stability/fixtures.mjs
BETA_ARCHIVE=/absolute/path/to/demuxe-1.1.2.tgz node tests/webkit-release.mjs
```

The archive must match the checked-out source revision. The wrapper records
archive and harness hashes; checks against a retained archive do not qualify
changed runtime bytes. Publication still requires the complete candidate run.


The manual workflow also accepts `qualify_only=true` and a full `source_ref`
commit SHA. This runs the same clean engine builds, provider gates, exact-archive
consumer/catalogue/API checks and macOS WebKit qualification used by a tag
release. It creates the proposed matching version tag only inside the Linux
build checkout. It does not push that tag, deploy Pages, create a GitHub Release
or stage npm. The `qualified-release`, `pages-build-evidence` and
`webkit-macos-release-evidence` artifacts retain the candidate and receipts.

```sh
gh workflow run pages.yml --ref release/1.1.2 \
  -f tag=v1.1.2 -f source_ref=<full-reviewed-commit-sha> -f qualify_only=true
```

Candidate runs report a separate **Release candidate qualification** commit
status, which stays pending until providers, archive checks and Apple WebKit
finish. Ordinary PR checks passing does not complete this status.

Review the entire run, including providers and Apple WebKit, before approving
publication. Preserve the downloaded archives and their hashes. After approval,
the public tag must point to the same commit, and manual publication must use
these exact qualified assets rather than rebuilding them. A candidate run that
has pending or failed gates is not qualified.

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

## Replay an ASS browser failure without rebuilding

For a retained `unqualified-runtime-debug` artifact, dispatch the existing
workflow with `replay_ass_run=<repository-run-id>`,
`replay_ass_sha256=<runtime-tgz-sha256>` and `source_ref=<archive-source-commit>`.
Keep `qualify_only=false` and supply the matching version tag. The replay skips
provider/native builds, runs the three ASS suites in Chrome and Firefox, and
retains failed-case worker retirement traces and responsiveness probes. The main ASS suite runs three independent times; selection and style run once.
Every result is retained, and any failure fails the replay. Archive bytes and source identity
must match the supplied values before browser tests run.

The separate **ASS archive replay** commit status describes diagnostics only.
It cannot satisfy **Release candidate qualification**, publish assets or stage
npm. A complete qualification remains necessary after resolving the failure.

For a reviewed controller change, `replay_ass_overlay=true` replaces only
the changed controller and native MSE worker modules in a private installed copy after verifying the
original archive. The receipt records original and replacement module hashes;
the archive itself is unchanged, and this diagnostic does not qualify the
modified runtime. `replay_ass_rounds` accepts 1–10 independent main-suite trials.
A final clean-source qualification must package and verify the fix normally.

The focused replay also runs the installed consumer's `native-remux` case once
per trial. It records fixture and module hashes and disables consumer startup
retries in this diagnostic lane. Private module replacements are recorded in
each consumer receipt and cannot qualify a release archive.

The Chrome replay also records eighty minimal MediaSource worker lifetimes across
window/iframe ownership, self-close/parent termination and same-element source replacement. This isolates browser
lifetime behavior without FFmpeg, decoded media or production player state; a
passing probe alone does not resolve a failing playback teardown.
