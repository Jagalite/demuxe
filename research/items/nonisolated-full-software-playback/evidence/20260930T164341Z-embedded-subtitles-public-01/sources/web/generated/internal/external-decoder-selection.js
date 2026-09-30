// SPDX-License-Identifier: Apache-2.0
import { webgpuDecoderSupported } from './webgpu-codecs.js';
export const EXACT_DECODE_INTENT = Object.freeze({
    targetWidth: null, targetHeight: null, qualityMode: 'exact', allowApproximation: false,
});
export function normalizeExternalDecodeIntent(intent = {}) {
    if (intent === null || typeof intent !== 'object' || Array.isArray(intent))
        throw Error('Invalid external decode intent');
    const targetWidth = intent.targetWidth ?? null, targetHeight = intent.targetHeight ?? null;
    if ((targetWidth === null) !== (targetHeight === null) ||
        targetWidth !== null && (!Number.isSafeInteger(targetWidth) || targetWidth < 1) ||
        targetHeight !== null && (!Number.isSafeInteger(targetHeight) || targetHeight < 1) ||
        !['exact', 'reduced'].includes(intent.qualityMode ?? 'exact') ||
        (intent.allowApproximation !== undefined && typeof intent.allowApproximation !== 'boolean'))
        throw Error('Invalid external decode intent');
    return Object.freeze({ targetWidth, targetHeight, qualityMode: intent.qualityMode ?? 'exact',
        allowApproximation: intent.allowApproximation ?? false });
}
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
export function selectExternalDecoderConfiguration(codec, webcodecsSupported, intent) {
    const backend = selectExternalDecoderBackend(codec, webcodecsSupported);
    return { backend, ...(backend === 'webgpu' ? { decodeIntent: normalizeExternalDecodeIntent(intent) } : {}) };
}
