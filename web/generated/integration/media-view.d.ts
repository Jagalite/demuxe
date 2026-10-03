// SPDX-License-Identifier: Apache-2.0
import { type PlaybackBinding } from './index.js';
import type { PlaybackRuntime } from '../contracts.js';
import type { TimeRange } from '../types.js';
/** Unknown coverage remains null on state; native-shaped ranges are a lossy view. */
export declare function timeRanges(ranges: readonly TimeRange[] | null): TimeRanges;
export declare const MEDIA_VIEW_EVENTS: readonly ["play", "playing", "pause", "waiting", "ended", "timeupdate", "durationchange", "volumechange", "ratechange", "seeking", "seeked", "loadedmetadata", "emptied", "operationerror", "error"];
/** One snapshot projection, no surface listeners, timers, source requests or readiness guesses. */
export declare class MediaView extends EventTarget {
    private runtime;
    readonly binding: PlaybackBinding;
    private control;
    private stops;
    private cleanup?;
    constructor(runtime: PlaybackRuntime);
    /** Initialize an existing control consumer from an already accepted snapshot. */
    synchronize(): void;
    private emit;
    get state(): Readonly<{
        status: "idle" | "paused" | "playing" | "buffering" | "ended" | "error";
        playbackIntent: "play" | "pause";
        pendingOperation: import("../types.js").PendingOperation | null;
        sourceId: number | null;
        currentTime: number;
        duration: number | null;
        streamType: "unknown" | "vod" | "live";
        subtitlesVisible: boolean;
        volume: number;
        muted: boolean;
        playbackRate: number;
        activeMode: import("../types.js").PlaybackMode | null;
        automaticSelection: boolean;
        buffered: readonly TimeRange[] | null;
        seekable: readonly TimeRange[] | null;
        cached: readonly TimeRange[] | null;
        trackPolicy: import("../types.js").TrackPolicy;
        audioTracks: readonly import("../types.js").MediaTrack[];
        subtitleTracks: readonly import("../types.js").MediaTrack[];
        timing: import("../types.js").TimingSettings;
        loop: import("../types.js").LoopPolicy;
        playbackRange: import("../types.js").PlaybackRange | null;
        streaming: import("../types.js").StreamingState | null;
        audioOutputDevice: string;
        mediaInfo: import("../types.js").MediaInfo;
        capabilities: import("../types.js").PlayerCapabilities;
        error: import("../types.js").SessionError | null;
    }>;
    get paused(): boolean;
    get ended(): boolean;
    get currentTime(): number;
    set currentTime(value: number);
    get duration(): number;
    get volume(): number;
    set volume(value: number);
    get muted(): boolean;
    set muted(value: boolean);
    get playbackRate(): number;
    set playbackRate(value: number);
    get seeking(): boolean;
    get buffered(): TimeRanges;
    get seekable(): TimeRanges;
    get error(): Readonly<{
        code: import("../types.js").PlayerErrorCode;
        message: string;
        operationId: number | null;
        operation: import("../types.js").OperationKind | null;
        scope: "operation" | "session";
        retryable: boolean;
    }> | null;
    play(): Promise<void>;
    pause(): void;
    dispose(): Promise<void>;
}
