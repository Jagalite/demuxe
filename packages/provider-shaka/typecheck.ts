// SPDX-License-Identifier: Apache-2.0
// Check the adapter's observed data against the pinned upstream declarations.
import Upstream from 'shaka-player';
import type {Shaka} from '../../src/internal/shaka-api.js';
type Observations='getAudioTracks'|'getVariantTracks'|'getTextTracks'|'getConfiguration'|'getManifest'|'getImageTracks'|'getThumbnails'|'getLoadMode'|'seekRange'|'isDynamic'|'isBuffering'|'getPlayheadTimeAsDate';
const observations:Pick<Shaka.Player,Observations>={} as Upstream.Player;
const entry:Pick<typeof Shaka.Player,'version'|'isBrowserSupported'|'LoadMode'>=Upstream.Player;
const request:Shaka.extern.Request={} as Upstream.extern.Request;
void observations;void entry;void request;
