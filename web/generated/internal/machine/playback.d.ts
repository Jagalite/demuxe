// SPDX-License-Identifier: Apache-2.0
export type PlaybackControl = Readonly<{
    serial: number;
    plays: readonly number[];
    seeks: readonly number[];
    latestSeek: number | null;
    observedPlaying: boolean;
    observedWaiting: boolean;
    sampleSession: number | null;
    sampleSequence: number;
}>;
export type PlaybackInput = Readonly<{
    type: 'play.request';
}> | Readonly<{
    type: 'play.retire';
}> | Readonly<{
    type: 'play.settled';
    id: number;
}> | Readonly<{
    type: 'seek.settled';
    id: number;
}> | Readonly<{
    type: 'seek.request';
    latest: boolean;
}> | Readonly<{
    type: 'playback.observed';
    playing?: boolean;
    waiting?: boolean;
}>;
export declare function initialPlayback(): PlaybackControl;
/** Logical play verification and latest-seek lifetimes are distinct from FIFO
 * operation lifetime. The shell resolves IDs to physical abort controllers. */
export declare function transitionPlayback(state: PlaybackControl, input: PlaybackInput): Readonly<{
    state: Readonly<{
        serial: number;
        plays: readonly number[];
        seeks: readonly number[];
        latestSeek: number | null;
        observedPlaying: boolean;
        observedWaiting: boolean;
        sampleSession: number | null;
        sampleSequence: number;
    }>;
    id: undefined;
    retire: readonly number[];
}> | Readonly<{
    state: Readonly<{
        plays: readonly never[];
        serial: number;
        seeks: readonly number[];
        latestSeek: number | null;
        observedPlaying: boolean;
        observedWaiting: boolean;
        sampleSession: number | null;
        sampleSequence: number;
    }>;
    retire: readonly number[];
}> | Readonly<{
    state: Readonly<{
        plays: readonly number[];
        serial: number;
        seeks: readonly number[];
        latestSeek: number | null;
        observedPlaying: boolean;
        observedWaiting: boolean;
        sampleSession: number | null;
        sampleSequence: number;
    }>;
    retire: readonly never[];
}> | Readonly<{
    state: Readonly<{
        serial: number;
        seeks: readonly number[];
        latestSeek: number | null;
        plays: readonly number[];
        observedPlaying: boolean;
        observedWaiting: boolean;
        sampleSession: number | null;
        sampleSequence: number;
    }>;
    id: number;
    retire: readonly number[];
}>;
