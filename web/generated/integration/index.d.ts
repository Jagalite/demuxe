// SPDX-License-Identifier: Apache-2.0
import { Player } from '../unified-player.js';
import type { PlaybackRuntime, StateSource } from '../contracts.js';
import type { PlayerOptions, PlayerState, SessionError } from '../types.js';
export type { PlaybackControl, PlaybackRuntime, StateSource, PlayerAPI } from '../contracts.js';
/** Initial delivery and Object.is equality by default. Observer failures are isolated. */
export declare function subscribeSelector<T>(source: StateSource, select: (state: PlayerState) => T, listener: (value: T) => void, equal?: (a: T, b: T) => boolean): () => void;
export type BindingError = Readonly<{
    origin: 'integration';
    sourceId: number | null;
    error: SessionError;
}>;
export type BindingOptions = {
    onOperationError?: (error: BindingError) => void;
};
/** Application owns sources. Disposal never cancels accepted or unrelated core work. */
export declare class PlaybackBinding {
    private runtime;
    readonly ownership: 'owned' | 'borrowed';
    private options;
    readonly sourceAuthority: "application";
    private active;
    private cleanup?;
    private listeners;
    private notifications;
    constructor(runtime: PlaybackRuntime, ownership: 'owned' | 'borrowed', options?: BindingOptions);
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
        buffered: readonly import("../types.js").TimeRange[] | null;
        seekable: readonly import("../types.js").TimeRange[] | null;
        cached: readonly import("../types.js").TimeRange[] | null;
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
        error: SessionError | null;
    }>;
    get disposed(): boolean;
    get diagnostics(): Readonly<{
        origin: "integration";
        subscriptions: number;
        notifications: number;
    }>;
    subscribe(listener: (state: PlayerState) => void): () => void;
    private assertActive;
    /** Invoke immediately, preserving browser activation. Retain canonical completion. */
    run<T>(operation: () => Promise<T>): Promise<T>;
    private report;
    play(): Promise<void>;
    pause(): Promise<void>;
    seek(time: number): Promise<void>;
    setVolume(value: number): Promise<void>;
    setMuted(value: boolean): Promise<void>;
    setPlaybackRate(value: number): Promise<void>;
    dispose(): Promise<void>;
}
export declare function bindPlayer(player: PlaybackRuntime, options?: BindingOptions): PlaybackBinding;
export declare function createPlayerBinding(container: HTMLElement, options?: PlayerOptions, bindingOptions?: BindingOptions): {
    player: Player;
    binding: PlaybackBinding;
};
