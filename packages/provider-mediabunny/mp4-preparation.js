// SPDX-License-Identifier: Apache-2.0
import {createVideoPreparer} from './video-preparation.js';
import {inspectMp4TrackProfiles} from './mp4-profile.js';

export function createMP4VideoPreparer({load} = {}) {
  return createVideoPreparer({load, codec: 'avc', sourceCodec: 'h264',
    formats: (runtime, output) => output ? [runtime.MP4] : [runtime.MP4, runtime.QTFF],
    outputFormat: runtime => new runtime.Mp4OutputFormat({fastStart: false}),
    inspectTracks: inspectMp4TrackProfiles, audio: true, audioOnly: true,
    profileName: (name,audio,video) => ['mp4','quicktime file format'].includes(name) ? (name==='mp4'?'mp4':'mov')+(!video?'-aac-audio-only-v1':audio?'-h264-aac-av-v1':'-h264-video-only-v1') : undefined,
  });
}
