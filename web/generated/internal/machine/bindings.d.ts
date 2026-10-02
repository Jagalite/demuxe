// SPDX-License-Identifier: Apache-2.0
import type { PlayerState } from '../../types.js';
export type BindingState = Readonly<{
    ownership: 'owned' | 'borrowed';
    disposed: boolean;
    nextSubscription: number;
    subscriptions: readonly number[];
    notifications: number;
}>;
export type BindingCommand = Readonly<{
    type: 'run' | 'subscribe';
    runtimeDestroyed: boolean;
}> | Readonly<{
    type: 'notify' | 'unsubscribe';
    id: number;
}> | Readonly<{
    type: 'dispose';
}>;
export type BindingDecision = Readonly<{
    state: BindingState;
    subscriptionId?: number;
    deliver?: boolean;
    release?: readonly number[];
    destroyRuntime?: boolean;
    error?: Readonly<{
        code: 'ABORTED';
        message: string;
    }>;
}>;
export declare function initialBindingState(ownership: 'owned' | 'borrowed'): BindingState;
export declare function bindingSubscriptionActive(state: BindingState, id: number): boolean;
export declare function transitionBinding(state: BindingState, command: BindingCommand): BindingDecision;
export declare function bindingDiagnostics(state: BindingState): Readonly<{
    origin: "integration";
    subscriptions: number;
    notifications: number;
}>;
export type SelectorState = Readonly<{
    active: boolean;
    initialized: boolean;
}>;
export declare function initialSelectorState(): SelectorState;
/** Selection/equality callbacks are application effects. Only their sampled
 * equality and the observer lifetime participate in the delivery decision. */
export declare function transitionSelector(state: SelectorState, command: Readonly<{
    type: 'stop';
} | {
    type: 'observe';
    equal: boolean;
}>): Readonly<{
    state: Readonly<{
        active: boolean;
        initialized: boolean;
    }>;
    deliver: false;
}> | Readonly<{
    state: Readonly<{
        initialized: true;
        active: boolean;
    }>;
    deliver: true;
}>;
export type MediaViewEvent = Readonly<{
    type: string;
    detail?: PlayerState['error'];
}>;
export type MediaViewState = Readonly<{
    previous: PlayerState | null;
}>;
export declare function initialMediaViewState(): MediaViewState;
/** Player snapshots are immutable data. The shell fences each dispatched event
 * against reentrant source replacement and never infers seek settlement. */
export declare function transitionMediaView(state: MediaViewState, next: PlayerState): Readonly<{
    state: Readonly<{
        previous: Readonly<{
            status: "idle" | "paused" | "playing" | "buffering" | "ended" | "error";
            playbackIntent: "play" | "pause";
            pendingOperation: import("../../types.js").PendingOperation | null;
            sourceId: number | null;
            currentTime: number;
            duration: number | null;
            streamType: "unknown" | "vod" | "live";
            subtitlesVisible: boolean;
            volume: number;
            muted: boolean;
            playbackRate: number;
            activeMode: import("../../types.js").PlaybackMode | null;
            automaticSelection: boolean;
            buffered: readonly import("../../types.js").TimeRange[] | null;
            seekable: readonly import("../../types.js").TimeRange[] | null;
            cached: readonly import("../../types.js").TimeRange[] | null;
            trackPolicy: import("../../types.js").TrackPolicy;
            audioTracks: readonly import("../../types.js").MediaTrack[];
            subtitleTracks: readonly import("../../types.js").MediaTrack[];
            timing: import("../../types.js").TimingSettings;
            loop: import("../../types.js").LoopPolicy;
            playbackRange: import("../../types.js").PlaybackRange | null;
            streaming: import("../../types.js").StreamingState | null;
            audioOutputDevice: string;
            mediaInfo: import("../../types.js").MediaInfo;
            capabilities: import("../../types.js").PlayerCapabilities;
            error: import("../../types.js").SessionError | null;
        }>;
    }>;
    events: readonly Readonly<{
        type: string;
        detail?: PlayerState["error"];
    }>[];
}>;
export declare function initialMediaViewEvents(state: PlayerState): readonly string[];
