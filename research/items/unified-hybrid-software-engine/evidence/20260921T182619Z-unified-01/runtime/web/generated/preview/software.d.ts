// SPDX-License-Identifier: GPL-3.0-or-later
import { type RemoteSource } from '../internal/wasm-player.js';
import type { MediaInputOptions, ResourceLimits } from '../types.js';
import type { PreviewContext, PreviewProvider, PreviewResult } from './controller.js';
export type SoftwarePreviewSource = {
    file: Blob;
    input?: MediaInputOptions;
} | {
    remote: RemoteSource;
};
/** Disposable, paused software engine. Never receives the playback backend. */
export declare class SoftwarePreviewProvider implements PreviewProvider {
    private source;
    private document;
    private assetBase;
    private limits;
    readonly id = "software";
    readonly priority = 50;
    constructor(source: () => SoftwarePreviewSource | undefined, document: Document, assetBase: URL, limits?: ResourceLimits);
    canHandle(): boolean;
    getFrame(request: PreviewContext): Promise<PreviewResult | null>;
}
