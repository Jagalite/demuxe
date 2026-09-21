// SPDX-License-Identifier: GPL-3.0-or-later
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
    constructor(source: () => Blob | undefined, document: Document, maxDecodePixels?: number);
    canHandle(): boolean;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
