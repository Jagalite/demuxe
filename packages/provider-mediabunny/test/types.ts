// SPDX-License-Identifier: Apache-2.0
import {Input,CustomSource,WAVE,CanvasSink} from 'mediabunny';
import type {MediaInspector,PreviewProvider} from 'demuxe';
import {createMediaBunnyInspector,createMediaBunnyPreviewProvider} from '../index.js';
const inspector:MediaInspector=createMediaBunnyInspector({formats:[WAVE],load:async()=>({Input,CustomSource})});
const preview:PreviewProvider=createMediaBunnyPreviewProvider({formats:[WAVE],getSource:()=>null,load:async()=>({Input,CustomSource,CanvasSink})});
createMediaBunnyPreviewProvider({formats:[WAVE],getSource:()=>null,
  // @ts-expect-error Preview requires its canvas sink; inspection does not.
  load:async()=>({Input,CustomSource}),
});
void inspector;void preview;
