<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe core

Reusable original routing decisions, capability evidence, transport, container
contracts and a bounded MP4 probe, licensed **Apache-2.0**.
Copyright (C) 2026 webmpv contributors.

Build from the repository root with `npm ci && npm run build:core`. Install the
resulting `build/core/demuxe-core-*.tgz` locally. This creates a candidate archive;
it does not publish to npm.

```js
import { planAdmission, RuntimeCapabilities } from 'demuxe-core';
import { cheapMP4Probe } from 'demuxe-core/mp4-probe';
import { RangeReader } from 'demuxe-core/range-reader';
```

The root export includes TypeScript declarations. The JavaScript utility
subpaths expose the original JavaScript APIs. Browser APIs are needed to run
browser probes and transport; importing the root does not start playback.
Routing results describe Demuxe's contracts, not proof of browser playback.

The complete `demuxe` player, UI, engine workers, and FFmpeg-backed source probe
use GPL-3.0-or-later. They are excluded from this package. Do not add player
imports or engine assets to the core package. The packaging check validates the
explicit source list, module imports, declarations, metadata and archive contents.

This README is CC BY 4.0. Attribute “Demuxe contributors, Demuxe core”, link
https://github.com/Jagalite/demuxe and https://creativecommons.org/licenses/by/4.0/,
and indicate changes. The software examples use Apache-2.0.
