<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Missing playback engines: clean build

This run builds the maintained beta engines from source revision
`8666434920cd4f4fc35a5c099901826e03be8916` in an isolated checkout.
The captured runtime-worker patch is the only copied dirty production input.
Only the newly built `engine-hybrid` and `engine-software-full` directories are
installed into the working checkout; existing remux/adaptation assets are retained.

[Build status and installed hashes](build.json) · [Build log](files/build.log) ·
[Driver](files/build-driver.py) · [Captured worker patch](files/runtime-worker.patch)

The build uses the pinned Emscripten 4.0.14 SDK and hash-verified source archives.
All extracted sources, objects, library prefixes and compiler caches start fresh.
The final beta build record checks unchanged inputs and SDK sources and records
linked artifact hashes, tool identities, source hashes and license configuration.
Software and Hybrid engine artifacts are GPL-3.0-or-later; build tooling is
Apache-2.0 and this documentation is CC-BY-4.0. Dependency terms are recorded in
the repository licensing inventory and generated engine notices.

Build success does not establish playback correctness. The head-to-head follow-up
reuses the exact earlier fixtures and records browser outcomes separately.
No CPU or percentage-gain measurement is part of this build.

## Recorded outcome

Build and installation completed successfully. Final records are
[beta build](beta-build.json), [toolchain](beta-toolchain.json), and
[captured configuration files](files/configurations/build/obj-software-full-ffmpeg/config.h).
The [56-case follow-up](../demuxe-with-engines-01/REPORT.md) recorded 38 passed,
4 failed and 14 limited/fixture-blocked outcomes, with no missing-engine blockers.
The [original four Demuxe auto cases](../demuxe-original-with-engines-01/REPORT.md)
all passed. These are bounded browser correctness results; no performance ran.
