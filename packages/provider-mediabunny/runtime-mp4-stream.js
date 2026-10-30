// SPDX-License-Identifier: Apache-2.0
/*! Demuxe adapter: Apache-2.0. MediaBunny: MPL-2.0.
 * Corresponding source: mediabunny-mp4-stream-1.63.0-source.tar.gz in the deployed provider directory.
 * License texts and notices: NOTICE-mp4-stream.txt in that directory. */
import {MP4,QTFF,Input,BlobSource,CustomSource,StreamTarget,Output,Mp4OutputFormat,
  EncodedPacket,EncodedVideoPacketSource,EncodedAudioPacketSource,EncodedPacketSink} from 'mediabunny';
import {createMP4StreamProducer} from './stream-preparation.js';
import {installStreamWorker} from './worker-stream.js';
const runtime={MP4,QTFF,Input,BlobSource,CustomSource,StreamTarget,Output,Mp4OutputFormat,
  EncodedPacket,EncodedVideoPacketSource,EncodedAudioPacketSource,EncodedPacketSink};
export const createProducer=(file,options)=>createMP4StreamProducer(runtime,file,options);
if(typeof self!=='undefined'&&typeof document==='undefined')installStreamWorker(createProducer);
