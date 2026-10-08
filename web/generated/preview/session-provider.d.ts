// SPDX-License-Identifier: Apache-2.0
import type { Backend } from '../internal/backend.js';
import type { PreviewSource } from '../internal/preview-session.js';
import type { PreviewContext, PreviewProvider, PreviewResult } from './controller.js';
export type PreviewBinding = {
    backend: Backend;
    source: PreviewSource;
    key: string;
};
/** One reusable child, serialized with its predecessor's teardown. Cache entries
 * belong to the controller; an idle decoder is released after five seconds. */
export declare class SessionPreviewProvider implements PreviewProvider {
    private binding;
    private document;
    private concurrent;
    private maxDecodePixels;
    readonly id = "selected-engine";
    readonly priority = 30;
    readonly requiresDecoder = true;
    private owner?;
    private cleanup;
    private idle?;
    constructor(binding: () => PreviewBinding | undefined, document: Document, concurrent: () => boolean, maxDecodePixels?: number);
    get allowDuringPlayback(): boolean;
    canHandle(): boolean;
    release(): Promise<void>;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
