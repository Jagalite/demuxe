// SPDX-License-Identifier: Apache-2.0
/*! Demuxe adapter: Apache-2.0. MediaBunny: MPL-2.0.
 * Corresponding source: mediabunny-1.63.0-source.tar.gz in the deployed provider directory.
 * License texts and notices: NOTICE.txt in that directory. */
import {WEBM, MATROSKA, Input, CustomSource, StreamTarget, Output, WebMOutputFormat,
  EncodedVideoPacketSource, EncodedAudioPacketSource, EncodedPacketSink} from 'mediabunny';
import {createWebMVideoPreparer} from './file-preparation.js';
const runtime = {WEBM, MATROSKA, Input, CustomSource, StreamTarget, Output, WebMOutputFormat,
  EncodedVideoPacketSource, EncodedAudioPacketSource, EncodedPacketSink};
import {installPreparationWorker} from './worker-preparation.js';
export const prepareFile = createWebMVideoPreparer({load: async () => runtime});
if (typeof self !== 'undefined' && typeof document === 'undefined') installPreparationWorker(prepareFile);
