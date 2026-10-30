// SPDX-License-Identifier: Apache-2.0
/*! Demuxe adapter: Apache-2.0. MediaBunny: MPL-2.0.
 * Corresponding source: mediabunny-mp4-1.63.0-source.tar.gz in the deployed provider directory.
 * License texts and notices: NOTICE-mp4.txt in that directory. */
import {MP4, QTFF, Input, CustomSource, StreamTarget, Output, Mp4OutputFormat,
  EncodedVideoPacketSource, EncodedAudioPacketSource, EncodedPacketSink} from 'mediabunny';
import {createMP4VideoPreparer} from './mp4-preparation.js';
const runtime = {MP4, QTFF, Input, CustomSource, StreamTarget, Output, Mp4OutputFormat,
  EncodedVideoPacketSource, EncodedAudioPacketSource, EncodedPacketSink};
import {installPreparationWorker} from './worker-preparation.js';
export const prepareFile = createMP4VideoPreparer({load: async () => runtime});
if (typeof self !== 'undefined' && typeof document === 'undefined') installPreparationWorker(prepareFile);
