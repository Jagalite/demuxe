// SPDX-License-Identifier: Apache-2.0
import type { Backend } from './backend.js';
import type { MediaInputOptions, RemoteSource } from '../types.js';
import type { PreviewContext, PreviewResult } from '../preview/controller.js';
export type PreviewSource = {
    file: Blob;
    input?: MediaInputOptions;
} | {
    remote: RemoteSource;
};
export interface PreviewSession {
    open(source: PreviewSource, signal: AbortSignal): Promise<void>;
    frame(request: PreviewContext): Promise<PreviewResult | null>;
    destroy(): Promise<void>;
}
export type PreviewSessionOptions = {
    document: Document;
    maxDecodePixels: number;
    sourceDimensions?: {
        width?: number;
        height?: number;
    };
};
export declare const previewBuffering: (memoryBudget?: number) => Readonly<Required<Pick<import("../types.js").BufferingOptions, "profile" | "preload">> & Pick<import("../types.js").BufferingOptions, "memoryBudget" | "aheadSeconds" | "behindSeconds">>;
type Decoder = Backend & {
    waitForPreviewPresentation?(): Promise<void>;
    waitForPreviewMetadata?(): Promise<void>;
    previewSnapshot?(): Promise<{
        blob: Blob;
        time: number;
        width: number;
        height: number;
    }>;
    verifyStartup?(expected: {
        video: boolean;
        audio: boolean;
    }): Promise<void>;
};
/** The child owns its transport and decoder; provider assets are borrowed.
 * No method on this adapter is allowed to receive the playback backend. */
export declare function independentPreviewSession(child: Decoder, surface: HTMLVideoElement | HTMLCanvasElement, path: string, options: PreviewSessionOptions): PreviewSession;
export {};
