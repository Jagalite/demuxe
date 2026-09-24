// SPDX-License-Identifier: Apache-2.0
import type { FontAsset } from '../types.js';
/** mpv embedded subtitle rendering on the accepted media timeline. One bounded RPC at a time. */
export declare class NativeMpvSubtitles {
    private video;
    private time;
    private file;
    private failed;
    private defaultStreamIndex?;
    readonly canvas: HTMLCanvasElement;
    private worker;
    private closed?;
    private destruction?;
    private pending;
    private sequence;
    private revision;
    private timingEpoch;
    private deadlineEpoch;
    private schedulerMode;
    private pumpTimer?;
    private pumpBusy;
    private stopped;
    private enabled;
    private busy;
    private changingTrack;
    private frame;
    private last;
    private lastRevision;
    private verifiedTrack?;
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
        default?: boolean;
    }>;
    service: Record<string, unknown>;
    readonly stats: {
        position: number;
        renders: number;
        bitmapUpdates: number;
        bytes: number;
        peakBytes: number;
        discarded: number;
        stateUpdates: number;
        scheduler: string;
    };
    constructor(video: HTMLVideoElement, time: () => number, base: URL, fonts: FontAsset[], file: File, failed: (e: Error) => void, defaultStreamIndex?: number | undefined);
    private request;
    private fail;
    private applyMode;
    private syncPump;
    private pump;
    select(id: string): Promise<void>;
    verify(): Promise<void>;
    /** Internal cue oracle for tests; never exposes media text in diagnostics. */
    currentText(): Promise<string>;
    /** Internal numeric timing probe. The current frame scheduler does not use it. */
    timingSnapshot(seconds?: number): Promise<any>;
    suspend(value: boolean): void;
    seek(seconds: number): Promise<void>;
    visible(value: boolean): void;
    private invalidate;
    private tick;
    destroy(): Promise<void>;
}
