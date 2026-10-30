// SPDX-License-Identifier: Apache-2.0
import {createMediaBunnyInspector} from '@demuxe/provider-mediabunny/inspect/mp4';
import {createMediaBunnyInspector as webm} from '@demuxe/provider-mediabunny/inspect/webm';
import {createMediaBunnyPreviewProvider} from '@demuxe/provider-mediabunny/preview/mp4';
import {createMediaBunnyPreviewProvider as webmPreview} from '@demuxe/provider-mediabunny/preview/webm';
const inspector=createMediaBunnyInspector();
const second=webm();
const preview=createMediaBunnyPreviewProvider({getSource:()=>null});
const other=webmPreview({getSource:()=>null,priority:50});
void [inspector,second,preview,other];
// @ts-expect-error Static format entry does not accept a different parser set.
createMediaBunnyInspector({formats:[]});
// @ts-expect-error Static preview entry cannot override its pinned loader.
createMediaBunnyPreviewProvider({getSource:()=>null,load:async()=>({})});
