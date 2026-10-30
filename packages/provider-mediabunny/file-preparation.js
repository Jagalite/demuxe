// SPDX-License-Identifier: Apache-2.0
import {createVideoPreparer} from './video-preparation.js';
import {inspectMatroskaPacketProfile} from './matroska-profile.js';

/** Finite WebM-output profiles. Source facts belong to complete inspection. */
export function createWebMVideoPreparer({load} = {}) {
  return createVideoPreparer({load, codec: 'vp8',
    formats: (runtime, output) => output ? [runtime.WEBM] : [runtime.WEBM, runtime.MATROSKA],
    outputFormat: runtime => new runtime.WebMOutputFormat(),
    inspectProfile: inspectMatroskaPacketProfile,
    profileName: name => ['webm', 'matroska'].includes(name) ? name + '-vp8-video-only-v1' : undefined,
  });
}
