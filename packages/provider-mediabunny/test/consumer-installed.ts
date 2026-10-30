// SPDX-License-Identifier: Apache-2.0
import {inspectMedia, type MediaInspector, type PreviewProvider} from 'demuxe';
import {createMediaBunnyInspector} from '@demuxe/provider-mediabunny/inspect/mp4';
import {createMediaBunnyPreviewProvider} from '@demuxe/provider-mediabunny/preview/webm';
const inspect: MediaInspector = createMediaBunnyInspector();
const preview: PreviewProvider = createMediaBunnyPreviewProvider({getSource:()=>null});
void inspectMedia(new ArrayBuffer(1),{inspector:inspect});void preview;
// @ts-expect-error The format entry does not permit a loader override.
createMediaBunnyPreviewProvider({getSource:()=>null,load:async()=>({})});
