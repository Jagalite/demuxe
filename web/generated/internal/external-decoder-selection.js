// SPDX-License-Identifier: Apache-2.0
import { webgpuDecoderSupported } from './webgpu-codecs.js';
// Internal video component choice; this never creates a public playback mode.
// Unknown WebCodecs support keeps the existing Hybrid trial.
export function chooseExternalDecoderBackend(webcodecsSupported, gpuQualified) {
    if (webcodecsSupported !== false)
        return 'webcodecs';
    return gpuQualified ? 'webgpu' : null;
}
export function selectExternalDecoderBackend(codec, webcodecsSupported) {
    return chooseExternalDecoderBackend(webcodecsSupported, webgpuDecoderSupported(codec));
}
