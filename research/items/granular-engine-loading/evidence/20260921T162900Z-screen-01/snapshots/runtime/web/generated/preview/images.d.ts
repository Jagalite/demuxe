// SPDX-License-Identifier: GPL-3.0-or-later
import type { PreviewContext, PreviewImage } from './controller.js';
/** Bounded encoded images; callers supply authorized bytes, never playback surfaces. */
export declare function rasterizePreview(blob: Blob, request: Pick<PreviewContext, 'width' | 'height' | 'signal'>, crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
}): Promise<{
    blob: Blob;
    width: number;
    height: number;
}>;
/** Public references are explicitly authored by the host; no playback credentials
 * are inherited. Authenticated sources should supply Blob results instead. */
export declare function previewImageBlob(image: PreviewImage, signal: AbortSignal): Promise<Blob>;
