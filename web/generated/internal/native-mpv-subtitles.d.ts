// SPDX-License-Identifier: Apache-2.0
import type { FontAsset, RemoteSource, SubtitleAsset } from '../types.js';
/** One mpv owner for embedded and external subtitles on the accepted media timeline. */
export declare class NativeMpvSubtitles {
    private video;
    private time;
    private source;
    private failed;
    private defaultStreamIndex?;
    private runtime;
    private lifetime;
    readonly canvas: HTMLCanvasElement;
    private worker;
    private closed?;
    private destruction?;
    private pending;
    private frame?;
    private pumpTimer?;
    private get output();
    private change;
    private get revision();
    private get schedulerMode();
    private get enabled();
    private get changingTrack();
    private get stopped();
    private current;
    private timelineWork;
    private get verifiedTrack();
    private timeline;
    private timelineCurrent;
    private loading;
    private cancelInitialization?;
    private observer?;
    private handlers;
    readonly ready: Promise<void>;
    get tracks(): {
        id: string;
        mpvId: number;
        'ff-index': number;
        type: string;
        selected?: boolean;
        default?: boolean;
        external?: boolean;
        'attachment-id'?: string;
        'external-index'?: number;
        title?: string;
        lang?: string;
        codec?: string;
    }[];
    /** A newly created external-only overlay omits the embedded source catalog. */
    resetTracks(): void;
    service: Record<string, unknown>;
    get stats(): {
        position: number;
        renders: number;
        bitmapUpdates: number;
        bytes: number;
        peakBytes: number;
        discarded: number;
        stateUpdates: number;
        scheduler: string;
    };
    constructor(video: HTMLVideoElement, time: () => number, base: URL, fonts: FontAsset[], source: File | RemoteSource, failed: (e: Error) => void, defaultStreamIndex?: number | undefined, runtime?: 'pthread' | 'jspi' | 'asyncify');
    private withTimeline;
    private drainTimeline;
    add(asset: SubtitleAsset): Promise<string>;
    private initializationDeadline;
    private completeRequest;
    private rejectRequests;
    private request;
    private fail;
    private applyMode;
    private playbackFacts;
    private syncPump;
    private pump;
    select(requested: string): Promise<void>;
    private selectTimeline;
    verify(signal?: AbortSignal): Promise<void>;
    private verifyTimeline;
    /** Internal cue oracle for tests; never exposes media text in diagnostics. */
    currentText(): Promise<string>;
    /** Internal numeric timing probe. The current frame scheduler does not use it. */
    timingSnapshot(seconds?: number): Promise<any>;
    suspend(value: boolean): void;
    seek(seconds: number): Promise<void>;
    visible(value: boolean): void;
    private invalidate;
    private scheduleFrame;
    private tick;
    destroy(): Promise<void>;
}
