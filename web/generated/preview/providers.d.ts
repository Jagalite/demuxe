// SPDX-License-Identifier: Apache-2.0
import type { PreviewContext, PreviewProvider, PreviewResult } from './controller.js';
/** Host-authored storyboards can return encoded tiles or references without a decoder. */
export declare class AuthoredPreviewProvider implements PreviewProvider {
    private lookup;
    private sourceId?;
    readonly id = "authored";
    readonly priority = 10;
    constructor(lookup: (request: PreviewContext) => Promise<PreviewResult | null>, sourceId?: string | undefined);
    canHandle(request: PreviewContext): boolean;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
/** Uses a separate muted media element and the browser's existing demux/decoder.
 * Local Blob inputs only: no uncontrolled second remote buffering stack. */
export declare class LocalVideoPreviewProvider implements PreviewProvider {
    private source;
    private document;
    private maxDecodePixels;
    readonly id = "local-browser";
    readonly priority = 40;
    readonly requiresDecoder = true;
    readonly allowDuringPlayback = true;
    constructor(source: () => Blob | undefined, document: Document, maxDecodePixels?: number);
    canHandle(): boolean;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
/** Reuse the accepted packet-copy route for a local container the browser cannot
 * open directly. This is an independent, muted session, never the main player. */
export declare class LocalRemuxPreviewProvider implements PreviewProvider {
    private source;
    private document;
    private create;
    private maxDecodePixels;
    readonly id = "local-remux";
    readonly priority = 35;
    readonly requiresDecoder = true;
    readonly allowDuringPlayback = true;
    constructor(source: () => Blob | undefined, document: Document, create: (video: HTMLVideoElement) => import('../internal/native-player.js').NativePlayer, maxDecodePixels?: number);
    canHandle(): boolean;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
