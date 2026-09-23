// SPDX-License-Identifier: Apache-2.0
import type { FontAsset, SubtitleAsset } from '../types.js';
/** External ASS rendering on the accepted media timeline. One bounded RPC at a time. */
export declare class NativeASS {
    private video;
    private time;
    private failed;
    readonly canvas: HTMLCanvasElement;
    private worker;
    private pending;
    private sequence;
    private revision;
    private stopped;
    private enabled;
    private busy;
    private changingTrack;
    private frame;
    private videoFrame;
    private last;
    private lastRevision;
    private loading;
    private observer?;
    private handlers;
    readonly ready: Promise<void>;
    readonly stats: {
        renders: number;
        bitmapUpdates: number;
        bytes: number;
        peakBytes: number;
        discarded: number;
    };
    constructor(video: HTMLVideoElement, time: () => number, base: URL, fonts: FontAsset[], failed: (e: Error) => void);
    private request;
    private fail;
    load(asset: SubtitleAsset): Promise<void>;
    visible(value: boolean): void;
    private invalidate;
    private tick;
    destroy(): void;
}
