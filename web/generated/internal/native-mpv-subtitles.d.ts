// SPDX-License-Identifier: GPL-3.0-or-later
import type { FontAsset } from '../types.js';
/** mpv embedded subtitle rendering on the accepted media timeline. One bounded RPC at a time. */
export declare class NativeMpvSubtitles {
    private video;
    private time;
    private file;
    private failed;
    readonly canvas: HTMLCanvasElement;
    private worker;
    private closed?;
    private destruction?;
    private pending;
    private sequence;
    private revision;
    private stopped;
    private enabled;
    private busy;
    private changingTrack;
    private frame;
    private last;
    private lastRevision;
    private loading;
    private observer?;
    private handlers;
    readonly ready: Promise<void>;
    tracks: Array<{
        id: string;
        mpvId: number;
        'ff-index': number;
        type: string;
        selected?: boolean;
    }>;
    service: Record<string, unknown>;
    readonly stats: {
        position: number;
        renders: number;
        bitmapUpdates: number;
        bytes: number;
        peakBytes: number;
        discarded: number;
    };
    constructor(video: HTMLVideoElement, time: () => number, base: URL, fonts: FontAsset[], file: File, failed: (e: Error) => void);
    private request;
    private fail;
    select(id: string): Promise<void>;
    verify(): Promise<void>;
    suspend(value: boolean): void;
    seek(seconds: number): Promise<void>;
    visible(value: boolean): void;
    private invalidate;
    private tick;
    destroy(): Promise<void>;
}
