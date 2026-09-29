<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Tagged player demo

The [live demo](https://jagalite.github.io/demuxe/) is deployed by
[Tagged player demo and npm release](../.github/workflows/pages.yml). A new pushed tag builds
that tag's checkout, installs the locked Emscripten 4.0.14 SDK, rebuilds the
standard and private engines, and assembles the current player. Chromium and
Firefox must both pass the Pages playback test before the artifact is deployed.
New tags also run the complete [release pipeline](TAG-RELEASE.md): build and
qualify archives, publish a GitHub Release, then stage npm for your approval.
A failed release qualification blocks the tag deployment.
Updating or deleting an existing tag does not deploy. Manual dispatch requires
an existing tag. The tagged revision must contain this workflow, the current
Pages builder, and the generated player bindings matching its TypeScript source.

The page initially selects Playground. Classic and Modern remain available in
Settings → Appearance. Engines load when needed instead of preparing every
engine at page startup. Source downloads and `deployment-manifest.json` record
the exact tag, commit and file hashes. This is a development demo; successful
Pages checks do not constitute npm release qualification.

Repository Pages settings must use **GitHub Actions**, and the `github-pages`
environment must allow release tags. Preserve any existing branch policies.
The tag policies `*` and `**/*` permit ordinary names such as
`v0.3.0-beta.4` and slash-separated tag names.
See GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
The npm job runs after the tag pipeline publishes its verified GitHub Release.
It also accepts manually published verified releases, including prereleases.
It stages the qualified archive for maintainer approval in npm. Manual Pages
rebuilds do not publish releases or stage npm versions. See [npm automation](NPM-PUBLISHING.md)
for required assets and the one-time trusted publisher setup.

## Local validation

For a clean tagged engine build:

```sh
python3 scripts/build-pages.py --tag <tag> --output build/pages-site
node tests/pages-demo.mjs
BROWSER=firefox node tests/pages-demo.mjs
```

When working with existing local engines whose build record no longer matches
source, use a clearly identified test snapshot. This never bypasses the tagged
assembler's build-record checks:

```sh
npm run build
python3 scripts/build-pages.py --preview --output build/pages-preview
PAGES_DIR=build/pages-preview PAGES_ALLOW_PREVIEW=1 node tests/pages-demo.mjs
PAGES_DIR=build/pages-preview PAGES_ALLOW_PREVIEW=1 BROWSER=firefox node tests/pages-demo.mjs
```

Use a fresh output directory for each snapshot. `--preview` cannot be combined
with `--tag`, and deployment tests reject preview output unless explicitly
allowed for a local test. The workflow never enables that exception.
`python3 tests/pages-build.py` checks tag/dirty-source guards, relative paths,
source inclusion and artifact hashes using a synthetic archive. It does not
compile or qualify native engines.

## Playback and timing evidence

The test serves the artifact at `/demuxe/` without isolation headers, exercising
the actual Pages service-worker boot path. Each mode gets three fresh browser
contexts in one browser process. The bundled 12-second, 640×360 H.264/AAC MP4 is
loaded through the visible “Try an example” control, including its fetch and
local-File creation. Tests check native frame callbacks or Wasm rendered-frame
counters, non-silent audio samples, changing surface screenshots, pause/seek,
range responses, viewport fit, menu visibility and returning visits.

Results under `results/pages/<browser>-<timestamp>/` include browser version,
fixture and asset hashes, the exact test harness, screenshots, route, individual
trials, and minimum/median/maximum timings. Startup output timings begin at the
sample button's click event. Page-ready timings include the initial isolation
reload; returning page-ready timings measure a later reload. Seek timing ends
when the seek operation settles near its target; a separate screenshot checks
the changed picture afterward.

Audio instrumentation samples an analyser at the output graph every 10 ms.
Native video uses `requestVideoFrameCallback`; Wasm uses its rendered counter,
which may be reported later than the first physical presentation. These are
instrumented browser observations, not physical display/speaker latency. Fresh
contexts do not imply cold OS, compiler or browser-process caches. Loopback
measurements do not establish GitHub CDN latency or production performance.

See the [2026-09-28 local validation and timing report](PAGES-VALIDATION-20260928.md).
