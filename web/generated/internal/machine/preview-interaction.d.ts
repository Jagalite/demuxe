// SPDX-License-Identifier: Apache-2.0
import type { PreviewSamplingContext } from '../../types.js';
type Source = PreviewSamplingContext['interaction']['source'];
export type PreviewInteractionState = Readonly<{
    source: Source;
    focus: number;
    at: number | null;
    bucketSince: number | null;
    movedAt: number | null;
    velocity: number;
}>;
export declare function createPreviewInteraction(): PreviewInteractionState;
/** Observations and clock values are supplied by the owner, never read here. */
export declare function observePreviewInteraction(state: PreviewInteractionState, source: Source, focus: number, at: number, bucketSeconds: number): PreviewInteractionState;
export declare function snapshotPreviewInteraction(state: PreviewInteractionState, at: number): PreviewSamplingContext['interaction'];
export {};
